import Foundation
import SherpaOnnxC

// Silero VAD from sherpa-onnx. It only tells whether speech is going on; the end of an utterance
// (silence threshold from settings) is decided in TypeScript.
final class SileroVad {
  private let detector: OpaquePointer

  init(sampleRate: Int32) throws {
    guard let model = Bundle(for: SileroVad.self).path(forResource: "silero_vad", ofType: "onnx")
      ?? Bundle.main.path(forResource: "silero_vad", ofType: "onnx")
    else {
      throw SileroVadError.modelMissing
    }
    let created: OpaquePointer? = model.withCString { modelPath in
      "cpu".withCString { provider in
        var config = SherpaOnnxVadModelConfig()
        config.silero_vad.model = modelPath
        config.silero_vad.threshold = 0.5
        config.silero_vad.min_silence_duration = 0.25
        config.silero_vad.min_speech_duration = 0.25
        config.silero_vad.window_size = 512
        config.silero_vad.max_speech_duration = 30
        config.sample_rate = sampleRate
        config.num_threads = 1
        config.provider = provider
        config.debug = 0
        return SherpaOnnxCreateVoiceActivityDetector(&config, 30)
      }
    }
    guard let created else { throw SileroVadError.createFailed }
    detector = created
  }

  deinit {
    SherpaOnnxDestroyVoiceActivityDetector(detector)
  }

  func accept(_ samples: UnsafePointer<Float>, count: Int) -> Bool {
    SherpaOnnxVoiceActivityDetectorAcceptWaveform(detector, samples, Int32(count))
    let speaking = SherpaOnnxVoiceActivityDetectorDetected(detector) == 1
    // Segments are cut in TypeScript; drop sherpa's own queue so it does not grow.
    SherpaOnnxVoiceActivityDetectorClear(detector)
    return speaking
  }

  func reset() {
    SherpaOnnxVoiceActivityDetectorReset(detector)
  }
}

enum SileroVadError: Error {
  case modelMissing
  case createFailed
}
