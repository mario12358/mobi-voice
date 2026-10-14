import Foundation
import SherpaOnnxC

// Piper (VITS) voice from sherpa-onnx; files come from the model downloads, not the app bundle.
final class PiperTts {
  let modelPath: String
  private let tts: OpaquePointer

  init(modelPath: String, tokensPath: String, dataDir: String) throws {
    self.modelPath = modelPath
    let created: OpaquePointer? = modelPath.withCString { model in
      tokensPath.withCString { tokens in
        dataDir.withCString { data in
          "".withCString { empty in
            "cpu".withCString { provider in
              var config = SherpaOnnxOfflineTtsConfig()
              config.model.vits.model = model
              config.model.vits.lexicon = empty
              config.model.vits.tokens = tokens
              config.model.vits.data_dir = data
              config.model.vits.dict_dir = empty
              config.model.vits.noise_scale = 0.667
              config.model.vits.noise_scale_w = 0.8
              config.model.vits.length_scale = 1.0
              config.model.num_threads = 2
              config.model.debug = 0
              config.model.provider = provider
              config.rule_fsts = empty
              config.rule_fars = empty
              config.max_num_sentences = 1
              config.silence_scale = 0.2
              return SherpaOnnxCreateOfflineTts(&config)
            }
          }
        }
      }
    }
    guard let created else { throw PiperTtsError.createFailed }
    tts = created
  }

  deinit {
    SherpaOnnxDestroyOfflineTts(tts)
  }

  // 16-bit PCM, the same encoding the microphone events use.
  func generate(_ text: String) throws -> (pcm: Data, sampleRate: Int) {
    guard let audio = text.withCString({ SherpaOnnxOfflineTtsGenerate(tts, $0, 0, 1.0) }) else {
      throw PiperTtsError.generateFailed
    }
    defer { SherpaOnnxDestroyOfflineTtsGeneratedAudio(audio) }
    let count = Int(audio.pointee.n)
    var pcm = [Int16](repeating: 0, count: count)
    for index in 0..<count {
      let sample = max(-1, min(1, audio.pointee.samples[index]))
      pcm[index] = Int16(sample * 32767)
    }
    let data = pcm.withUnsafeBufferPointer { Data(buffer: $0) }
    return (data, Int(audio.pointee.sample_rate))
  }
}

enum PiperTtsError: Error {
  case createFailed
  case generateFailed
}
