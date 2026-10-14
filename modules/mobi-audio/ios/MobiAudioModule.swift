import AVFoundation
import ExpoModulesCore

// Microphone PCM and speech playback for the voice pipeline. Both go through one AVAudioEngine with
// voice processing (VoiceProcessingIO), so the system echo canceller removes the assistant's own voice
// from what the microphone hears.
public class MobiAudioModule: Module {
  private let engine = AVAudioEngine()
  private let player = AVAudioPlayerNode()
  private var playerFormat: AVAudioFormat?
  private var converter: AVAudioConverter?
  private var capturing = false
  private var interruptionObserver: NSObjectProtocol?
  private var vad: SileroVad?
  private var tts: PiperTts?
  private var keywords: StopKeywordSpotter?
  private var pendingPlayback: (id: Int, promise: Promise)?
  private var playbackCounter = 0

  public func definition() -> ModuleDefinition {
    Name("MobiAudio")

    Events("onAudio", "onInterruption")

    OnCreate {
      self.engine.attach(self.player)
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
      self.stopPlayback()
      self.stopCapture()
    }

    AsyncFunction("getPermission") { () -> [String: Any] in
      return Self.permissionResponse(AVAudioSession.sharedInstance().recordPermission)
    }

    AsyncFunction("requestPermission") { (promise: Promise) in
      AVAudioSession.sharedInstance().requestRecordPermission { _ in
        promise.resolve(Self.permissionResponse(AVAudioSession.sharedInstance().recordPermission))
      }
    }

    // Engine and playback state is only touched on the main queue.
    AsyncFunction("startCapture") { (sampleRate: Double) in
      try self.startCapture(sampleRate: sampleRate)
    }.runOnQueue(.main)

    AsyncFunction("stopCapture") {
      self.stopCapture()
    }.runOnQueue(.main)

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

    AsyncFunction("loadKws") { (sampleRate: Int) in
      if self.keywords == nil {
        self.keywords = try StopKeywordSpotter(sampleRate: Int32(sampleRate))
      }
    }

    // Synchronous, like the VAD: once per audio chunk while the assistant answers.
    Function("kwsAccept") { (samples: Float32Array, sampleRate: Int) -> String? in
      guard let keywords = self.keywords else { return nil }
      let pointer = samples.rawPointer.assumingMemoryBound(to: Float.self)
      return keywords.accept(pointer, count: samples.length, sampleRate: Int32(sampleRate))
    }

    Function("kwsReset") {
      self.keywords?.reset()
    }

    AsyncFunction("loadTts") { (modelPath: String, tokensPath: String, dataDir: String) in
      if self.tts?.modelPath != modelPath {
        self.tts = nil
        self.tts = try PiperTts(modelPath: modelPath, tokensPath: tokensPath, dataDir: dataDir)
      }
    }

    AsyncFunction("synthesize") { (text: String) -> [String: Any] in
      guard let tts = self.tts else {
        throw Exception(name: "tts_not_loaded", description: "Load a voice before synthesizing")
      }
      let audio = try tts.generate(text)
      return ["data": audio.pcm.base64EncodedString(), "sampleRate": audio.sampleRate]
    }

    // Resolves when the audio has been played back or playback was stopped.
    AsyncFunction("play") { (data: String, sampleRate: Double, promise: Promise) in
      do {
        try self.play(base64: data, sampleRate: sampleRate, promise: promise)
      } catch {
        promise.reject(error)
      }
    }.runOnQueue(.main)

    AsyncFunction("stopPlayback") {
      self.stopPlayback()
    }.runOnQueue(.main)
  }

  private static func permissionResponse(_ permission: AVAudioSession.RecordPermission) -> [String: Any] {
    switch permission {
    case .granted: return ["status": "granted", "canAskAgain": true]
    case .denied: return ["status": "denied", "canAskAgain": false]
    default: return ["status": "undetermined", "canAskAgain": true]
    }
  }

  private func ensureEngine(playbackRate: Double? = nil) throws {
    if !engine.isRunning {
      let session = AVAudioSession.sharedInstance()
      try session.setCategory(.playAndRecord, mode: .voiceChat, options: [.defaultToSpeaker, .allowBluetooth])
      try session.setActive(true)
      try engine.inputNode.setVoiceProcessingEnabled(true)
    }
    if let rate = playbackRate, playerFormat?.sampleRate != rate {
      guard let format = AVAudioFormat(standardFormatWithSampleRate: rate, channels: 1) else {
        throw Exception(name: "audio_format", description: "Cannot play \(rate) Hz audio")
      }
      if engine.isRunning { engine.stop() }
      engine.connect(player, to: engine.mainMixerNode, format: format)
      playerFormat = format
    }
    if !engine.isRunning {
      engine.prepare()
      try engine.start()
    }
  }

  private func startCapture(sampleRate: Double) throws {
    if capturing { return }
    try ensureEngine()
    let input = engine.inputNode
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
    capturing = true
  }

  private func stopCapture() {
    if capturing {
      engine.inputNode.removeTap(onBus: 0)
      converter = nil
      capturing = false
    }
    if pendingPlayback == nil && engine.isRunning {
      engine.stop()
    }
  }

  private func play(base64: String, sampleRate: Double, promise: Promise) throws {
    guard let data = Data(base64Encoded: base64) else {
      throw Exception(name: "audio_data", description: "Playback data is not base64")
    }
    stopPlayback()
    try ensureEngine(playbackRate: sampleRate)
    guard let format = playerFormat else { return }
    let frames = data.count / MemoryLayout<Int16>.size
    guard let buffer = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: AVAudioFrameCount(max(frames, 1))),
      let channel = buffer.floatChannelData?[0]
    else {
      throw Exception(name: "audio_format", description: "Cannot allocate playback buffer")
    }
    data.withUnsafeBytes { raw in
      let samples = raw.bindMemory(to: Int16.self)
      for index in 0..<frames {
        channel[index] = Float(Int16(littleEndian: samples[index])) / 32768
      }
    }
    buffer.frameLength = AVAudioFrameCount(frames)
    playbackCounter += 1
    let id = playbackCounter
    pendingPlayback = (id, promise)
    player.scheduleBuffer(buffer, completionCallbackType: .dataPlayedBack) { [weak self] _ in
      DispatchQueue.main.async { self?.finishPlayback(id) }
    }
    player.play()
  }

  private func finishPlayback(_ id: Int) {
    guard let pending = pendingPlayback, pending.id == id else { return }
    pendingPlayback = nil
    pending.promise.resolve()
    if !capturing && engine.isRunning {
      engine.stop()
    }
  }

  private func stopPlayback() {
    let pending = pendingPlayback
    pendingPlayback = nil
    player.stop()
    pending?.promise.resolve()
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
      stopPlayback()
      stopCapture()
      sendEvent("onInterruption", ["phase": "began"])
    case .ended:
      sendEvent("onInterruption", ["phase": "ended"])
    @unknown default:
      break
    }
  }
}
