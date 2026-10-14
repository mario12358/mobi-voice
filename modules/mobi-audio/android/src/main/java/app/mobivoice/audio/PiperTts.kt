package app.mobivoice.audio

import com.k2fsa.sherpa.onnx.OfflineTts
import com.k2fsa.sherpa.onnx.OfflineTtsConfig
import com.k2fsa.sherpa.onnx.OfflineTtsModelConfig
import com.k2fsa.sherpa.onnx.OfflineTtsVitsModelConfig

// Piper (VITS) voice from sherpa-onnx; files come from the model downloads, not the app assets.
class PiperTts(val modelPath: String, tokensPath: String, dataDir: String) {
  private val tts = OfflineTts(
    config = OfflineTtsConfig(
      model = OfflineTtsModelConfig(
        vits = OfflineTtsVitsModelConfig(model = modelPath, tokens = tokensPath, dataDir = dataDir),
        numThreads = 2,
        debug = false,
        provider = "cpu",
      ),
      maxNumSentences = 1,
    ),
  )

  // 16-bit PCM, the same encoding the microphone events use.
  fun generate(text: String): Pair<ShortArray, Int> {
    val audio = tts.generate(text, 0, 1.0f)
    val pcm = ShortArray(audio.samples.size) { index ->
      (audio.samples[index].coerceIn(-1f, 1f) * 32767).toInt().toShort()
    }
    return pcm to audio.sampleRate
  }

  fun release() = tts.release()
}
