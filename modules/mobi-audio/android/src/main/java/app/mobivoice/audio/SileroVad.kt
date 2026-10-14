package app.mobivoice.audio

import android.content.res.AssetManager
import com.k2fsa.sherpa.onnx.SileroVadModelConfig
import com.k2fsa.sherpa.onnx.Vad
import com.k2fsa.sherpa.onnx.VadModelConfig

// Silero VAD from sherpa-onnx. It only tells whether speech is going on; the end of an utterance
// (silence threshold from settings) is decided in TypeScript.
class SileroVad(assets: AssetManager, sampleRate: Int) {
  private val vad = Vad(
    assets,
    VadModelConfig(
      sileroVadModelConfig = SileroVadModelConfig(
        model = "silero_vad.onnx",
        threshold = 0.5f,
        minSilenceDuration = 0.25f,
        minSpeechDuration = 0.25f,
        windowSize = 512,
        maxSpeechDuration = 30f,
      ),
      sampleRate = sampleRate,
      numThreads = 1,
    ),
  )

  fun accept(samples: FloatArray): Boolean {
    vad.acceptWaveform(samples)
    val speaking = vad.isSpeechDetected()
    // Segments are cut in TypeScript; drop sherpa's own queue so it does not grow.
    vad.clear()
    return speaking
  }

  fun reset() = vad.reset()

  fun release() = vad.release()
}
