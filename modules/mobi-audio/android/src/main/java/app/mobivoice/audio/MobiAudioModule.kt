package app.mobivoice.audio

import android.Manifest
import android.annotation.SuppressLint
import android.content.Context
import android.media.AudioAttributes
import android.media.AudioFocusRequest
import android.media.AudioFormat
import android.media.AudioManager
import android.media.AudioRecord
import android.media.MediaRecorder
import android.media.audiofx.AcousticEchoCanceler
import android.media.audiofx.NoiseSuppressor
import android.util.Base64
import expo.modules.interfaces.permissions.Permissions
import expo.modules.kotlin.Promise
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.typedarray.Float32Array
import java.nio.ByteBuffer
import java.nio.ByteOrder

// Microphone PCM for the voice pipeline. VOICE_COMMUNICATION plus AcousticEchoCanceler gives the system
// echo canceller, so the assistant's own TTS is not heard back as the user's speech.
class MobiAudioModule : Module() {
  private var recorder: AudioRecord? = null
  private var echoCanceler: AcousticEchoCanceler? = null
  private var noiseSuppressor: NoiseSuppressor? = null
  private var reader: Thread? = null
  private var focusRequest: AudioFocusRequest? = null
  private var vad: SileroVad? = null

  @Volatile private var capturing = false

  private val audioManager: AudioManager
    get() = appContext.reactContext?.getSystemService(Context.AUDIO_SERVICE) as AudioManager

  // A phone call or another app taking the audio focus is the Android counterpart of an iOS interruption.
  private val focusListener = AudioManager.OnAudioFocusChangeListener { change ->
    when (change) {
      AudioManager.AUDIOFOCUS_LOSS, AudioManager.AUDIOFOCUS_LOSS_TRANSIENT -> {
        stopRecorder()
        sendEvent("onInterruption", mapOf("phase" to "began"))
      }
      AudioManager.AUDIOFOCUS_GAIN -> sendEvent("onInterruption", mapOf("phase" to "ended"))
    }
  }

  override fun definition() = ModuleDefinition {
    Name("MobiAudio")

    Events("onAudio", "onInterruption")

    OnDestroy {
      stopCapture()
      vad?.release()
      vad = null
    }

    AsyncFunction("getPermission") { promise: Promise ->
      Permissions.getPermissionsWithPermissionsManager(appContext.permissions, promise, Manifest.permission.RECORD_AUDIO)
    }

    AsyncFunction("requestPermission") { promise: Promise ->
      Permissions.askForPermissionsWithPermissionsManager(appContext.permissions, promise, Manifest.permission.RECORD_AUDIO)
    }

    AsyncFunction("startCapture") { sampleRate: Int ->
      startCapture(sampleRate)
    }

    AsyncFunction("stopCapture") {
      stopCapture()
    }

    AsyncFunction("loadVad") { sampleRate: Int ->
      if (vad == null) {
        val assets = appContext.reactContext?.assets ?: throw CodedException("vad_init", "No Android context", null)
        vad = SileroVad(assets, sampleRate)
      }
    }

    // Synchronous: the VAD runs once per audio chunk on the JS thread.
    Function("vadAccept") { samples: Float32Array ->
      val detector = vad ?: return@Function false
      detector.accept(FloatArray(samples.length) { samples[it] })
    }

    Function("vadReset") {
      vad?.reset()
    }
  }

  @SuppressLint("MissingPermission") // JS asks for RECORD_AUDIO before starting capture.
  private fun startCapture(sampleRate: Int) {
    if (capturing) return
    requestFocus()
    val minBuffer = AudioRecord.getMinBufferSize(sampleRate, AudioFormat.CHANNEL_IN_MONO, AudioFormat.ENCODING_PCM_16BIT)
    val chunkSamples = sampleRate / 10
    val record = AudioRecord(
      MediaRecorder.AudioSource.VOICE_COMMUNICATION,
      sampleRate,
      AudioFormat.CHANNEL_IN_MONO,
      AudioFormat.ENCODING_PCM_16BIT,
      maxOf(minBuffer, chunkSamples * 2 * 2),
    )
    if (record.state != AudioRecord.STATE_INITIALIZED) {
      record.release()
      throw CodedException("audio_init", "Cannot open the microphone", null)
    }
    if (AcousticEchoCanceler.isAvailable()) {
      echoCanceler = AcousticEchoCanceler.create(record.audioSessionId)?.apply { enabled = true }
    }
    if (NoiseSuppressor.isAvailable()) {
      noiseSuppressor = NoiseSuppressor.create(record.audioSessionId)?.apply { enabled = true }
    }
    recorder = record
    capturing = true
    record.startRecording()
    reader = Thread({ readLoop(record, sampleRate, chunkSamples) }, "MobiAudioCapture").apply { start() }
  }

  private fun readLoop(record: AudioRecord, sampleRate: Int, chunkSamples: Int) {
    val buffer = ShortArray(chunkSamples)
    while (capturing) {
      val read = record.read(buffer, 0, buffer.size)
      if (read <= 0) continue
      val bytes = ByteBuffer.allocate(read * 2).order(ByteOrder.LITTLE_ENDIAN)
      bytes.asShortBuffer().put(buffer, 0, read)
      val data = Base64.encodeToString(bytes.array(), Base64.NO_WRAP)
      sendEvent("onAudio", mapOf("data" to data, "sampleRate" to sampleRate))
    }
  }

  private fun stopRecorder() {
    if (!capturing) return
    capturing = false
    reader?.join(500)
    reader = null
    recorder?.run {
      stop()
      release()
    }
    recorder = null
    echoCanceler?.release()
    echoCanceler = null
    noiseSuppressor?.release()
    noiseSuppressor = null
  }

  private fun stopCapture() {
    stopRecorder()
    focusRequest?.let { audioManager.abandonAudioFocusRequest(it) }
    focusRequest = null
  }

  private fun requestFocus() {
    if (focusRequest != null) return
    val attributes = AudioAttributes.Builder()
      .setUsage(AudioAttributes.USAGE_VOICE_COMMUNICATION)
      .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
      .build()
    val request = AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN)
      .setAudioAttributes(attributes)
      .setOnAudioFocusChangeListener(focusListener)
      .build()
    audioManager.requestAudioFocus(request)
    focusRequest = request
  }
}
