import Foundation
import SherpaOnnxC

// "Stop" keyword spotting (sherpa-onnx KWS) on the microphone audio while the assistant answers.
final class StopKeywordSpotter {
  private let spotter: OpaquePointer
  private var stream: OpaquePointer

  init(sampleRate: Int32) throws {
    func resource(_ name: String, _ type: String) throws -> String {
      guard let path = Bundle(for: StopKeywordSpotter.self).path(forResource: name, ofType: type)
        ?? Bundle.main.path(forResource: name, ofType: type)
      else { throw KeywordSpotterError.modelMissing(name) }
      return path
    }
    let paths = [
      try resource("kws-encoder", "onnx"), try resource("kws-decoder", "onnx"), try resource("kws-joiner", "onnx"),
      try resource("kws-tokens", "txt"), try resource("kws-keywords", "txt"),
    ]
    let created: OpaquePointer? = paths[0].withCString { encoder in
      paths[1].withCString { decoder in
        paths[2].withCString { joiner in
          paths[3].withCString { tokens in
            paths[4].withCString { keywords in
              "cpu".withCString { provider in
                "".withCString { empty in
                  var config = SherpaOnnxKeywordSpotterConfig()
                  config.feat_config.sample_rate = sampleRate
                  config.feat_config.feature_dim = 80
                  config.model_config.transducer.encoder = encoder
                  config.model_config.transducer.decoder = decoder
                  config.model_config.transducer.joiner = joiner
                  config.model_config.tokens = tokens
                  config.model_config.num_threads = 1
                  config.model_config.provider = provider
                  config.model_config.debug = 0
                  config.model_config.model_type = empty
                  config.model_config.modeling_unit = empty
                  config.model_config.bpe_vocab = empty
                  config.max_active_paths = 4
                  config.num_trailing_blanks = 1
                  config.keywords_score = 1.0
                  config.keywords_threshold = 0.25
                  config.keywords_file = keywords
                  return SherpaOnnxCreateKeywordSpotter(&config)
                }
              }
            }
          }
        }
      }
    }
    guard let created, let stream = SherpaOnnxCreateKeywordStream(created) else {
      throw KeywordSpotterError.createFailed
    }
    spotter = created
    self.stream = stream
  }

  deinit {
    SherpaOnnxDestroyOnlineStream(stream)
    SherpaOnnxDestroyKeywordSpotter(spotter)
  }

  // Returns the keyword heard in these samples, if any.
  func accept(_ samples: UnsafePointer<Float>, count: Int, sampleRate: Int32) -> String? {
    SherpaOnnxOnlineStreamAcceptWaveform(stream, sampleRate, samples, Int32(count))
    var heard: String?
    while SherpaOnnxIsKeywordStreamReady(spotter, stream) == 1 {
      SherpaOnnxDecodeKeywordStream(spotter, stream)
      guard let result = SherpaOnnxGetKeywordResult(spotter, stream) else { continue }
      if let keyword = result.pointee.keyword, keyword.pointee != 0 {
        heard = String(cString: keyword)
        SherpaOnnxResetKeywordStream(spotter, stream)
      }
      SherpaOnnxDestroyKeywordResult(result)
    }
    return heard
  }

  func reset() {
    SherpaOnnxDestroyOnlineStream(stream)
    if let fresh = SherpaOnnxCreateKeywordStream(spotter) { stream = fresh }
  }
}

enum KeywordSpotterError: Error {
  case modelMissing(String)
  case createFailed
}
