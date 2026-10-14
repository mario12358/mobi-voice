import AVFoundation
import ExpoModulesCore

// Microphone PCM for the voice pipeline. Voice processing (VoiceProcessingIO) gives the system echo
// canceller, so the assistant's own TTS is not heard back as the user's speech.
public class MobiAudioModule: Module {
  private let engine = AVAudioEngine()
  private var converter: AVAudioConverter?
  private var capturing = false
  private var interruptionObserver: NSObjectProtocol?
  private var vad: SileroVad?

  public func definition() -> ModuleDefinition {
    Name("MobiAudio")

    Events("onAudio", "onInterruption")

    OnCreate {
      self.interruptionObserver = NotificationCenter.default.addObserver(
        forName: AVAudioSession.interruptionNotification,
        object: AVAudioSession.sharedInstance(),
        queue: .main
      ) { [weak self] notification in
        self?.handleInterruption(notification)
      }
    }

    OnDestroy {
      if let observer = self.interruptionObserver {
        NotificationCenter.default.removeObserver(observer)
      }
      self.stopEngine()
    }

    AsyncFunction("getPermission") { () -> [String: Any] in
      return Self.permissionResponse(AVAudioSession.sharedInstance().recordPermission)
    }

    AsyncFunction("requestPermission") { (promise: Promise) in
      AVAudioSession.sharedInstance().requestRecordPermission { _ in
        promise.resolve(Self.permissionResponse(AVAudioSession.sharedInstance().recordPermission))
      }
    }

    AsyncFunction("startCapture") { (sampleRate: Double) in
      try self.startEngine(sampleRate: sampleRate)
    }

    AsyncFunction("stopCapture") {
      self.stopEngine()
    }

    AsyncFunction("loadVad") { (sampleRate: Int) in
      if self.vad == nil {
        self.vad = try SileroVad(sampleRate: Int32(sampleRate))
      }
    }

    // Synchronous: the VAD runs once per audio chunk on the JS thread.
    Function("vadAccept") { (samples: Float32Array) -> Bool in
      guard let vad = self.vad else { return false }
      let pointer = samples.rawPointer.assumingMemoryBound(to: Float.self)
      return vad.accept(pointer, count: samples.length)
    }

    Function("vadReset") {
      self.vad?.reset()
    }
  }

  private static func permissionResponse(_ permission: AVAudioSession.RecordPermission) -> [String: Any] {
    switch permission {
    case .granted: return ["status": "granted", "canAskAgain": true]
    case .denied: return ["status": "denied", "canAskAgain": false]
    default: return ["status": "undetermined", "canAskAgain": true]
    }
  }

  private func startEngine(sampleRate: Double) throws {
    if capturing { return }
    let session = AVAudioSession.sharedInstance()
    try session.setCategory(.playAndRecord, mode: .voiceChat, options: [.defaultToSpeaker, .allowBluetooth])
    try session.setActive(true)

    let input = engine.inputNode
    try input.setVoiceProcessingEnabled(true)
    let inputFormat = input.outputFormat(forBus: 0)
    guard
      let target = AVAudioFormat(commonFormat: .pcmFormatInt16, sampleRate: sampleRate, channels: 1, interleaved: true),
      let converter = AVAudioConverter(from: inputFormat, to: target)
    else {
      throw Exception(name: "audio_format", description: "Cannot convert microphone audio to \(sampleRate) Hz mono")
    }
    self.converter = converter

    input.installTap(onBus: 0, bufferSize: 4096, format: inputFormat) { [weak self] buffer, _ in
      self?.emit(buffer, target: target)
    }
    engine.prepare()
    try engine.start()
    capturing = true
  }

  private func stopEngine() {
    if !capturing { return }
    engine.inputNode.removeTap(onBus: 0)
    engine.stop()
    converter = nil
    capturing = false
  }

  private func emit(_ buffer: AVAudioPCMBuffer, target: AVAudioFormat) {
    guard let converter = converter else { return }
    let ratio = target.sampleRate / buffer.format.sampleRate
    let capacity = AVAudioFrameCount(Double(buffer.frameLength) * ratio) + 1
    guard let output = AVAudioPCMBuffer(pcmFormat: target, frameCapacity: capacity) else { return }
    var consumed = false
    var error: NSError?
    converter.convert(to: output, error: &error) { _, status in
      if consumed {
        status.pointee = .noDataNow
        return nil
      }
      consumed = true
      status.pointee = .haveData
      return buffer
    }
    guard error == nil, output.frameLength > 0, let samples = output.int16ChannelData else { return }
    let data = Data(bytes: samples[0], count: Int(output.frameLength) * MemoryLayout<Int16>.size)
    sendEvent("onAudio", ["data": data.base64EncodedString(), "sampleRate": target.sampleRate])
  }

  private func handleInterruption(_ notification: Notification) {
    guard
      let raw = notification.userInfo?[AVAudioSessionInterruptionTypeKey] as? UInt,
      let type = AVAudioSession.InterruptionType(rawValue: raw)
    else { return }
    switch type {
    case .began:
      // The system has already stopped the engine; JS restarts capture when the interruption ends.
      stopEngine()
      sendEvent("onInterruption", ["phase": "began"])
    case .ended:
      sendEvent("onInterruption", ["phase": "ended"])
    @unknown default:
      break
    }
  }
}
