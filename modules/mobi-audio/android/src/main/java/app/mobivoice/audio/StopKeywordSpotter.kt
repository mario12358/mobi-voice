package app.mobivoice.audio

import android.content.res.AssetManager
import com.k2fsa.sherpa.onnx.FeatureConfig
import com.k2fsa.sherpa.onnx.KeywordSpotter
import com.k2fsa.sherpa.onnx.KeywordSpotterConfig
import com.k2fsa.sherpa.onnx.OnlineModelConfig
import com.k2fsa.sherpa.onnx.OnlineStream
import com.k2fsa.sherpa.onnx.OnlineTransducerModelConfig

// "Stop" keyword spotting (sherpa-onnx KWS) on the microphone audio while the assistant answers.
class StopKeywordSpotter(assets: AssetManager, private val sampleRate: Int) {
  private val spotter = KeywordSpotter(
    assets,
    KeywordSpotterConfig(
      featConfig = FeatureConfig(sampleRate = sampleRate, featureDim = 80),
      modelConfig = OnlineModelConfig(
        transducer = OnlineTransducerModelConfig(
          encoder = "kws-encoder.onnx",
          decoder = "kws-decoder.onnx",
          joiner = "kws-joiner.onnx",
        ),
        tokens = "kws-tokens.txt",
        numThreads = 1,
        provider = "cpu",
      ),
      maxActivePaths = 4,
      keywordsFile = "kws-keywords.txt",
      keywordsScore = 1.0f,
      keywordsThreshold = 0.25f,
      numTrailingBlanks = 1,
    ),
  )
  private var stream: OnlineStream = spotter.createStream()

  // Returns the keyword heard in these samples, if any.
  fun accept(samples: FloatArray): String? {
    stream.acceptWaveform(samples, sampleRate)
    var heard: String? = null
    while (spotter.isReady(stream)) {
      spotter.decode(stream)
      val keyword = spotter.getResult(stream).keyword
      if (keyword.isNotEmpty()) {
        heard = keyword
        spotter.reset(stream)
      }
    }
    return heard
  }

  fun reset() {
    stream.release()
    stream = spotter.createStream()
  }

  fun release() {
    stream.release()
    spotter.release()
  }
}
