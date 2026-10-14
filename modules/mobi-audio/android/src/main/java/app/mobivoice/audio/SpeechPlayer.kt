package app.mobivoice.audio

import android.media.AudioAttributes
import android.media.AudioFormat
import android.media.AudioTrack
import expo.modules.kotlin.Promise

// Plays synthesized speech as voice communication, the stream the echo canceller subtracts from the
// microphone. One utterance at a time; a new one or stop() ends the previous.
class SpeechPlayer {
  private var track: AudioTrack? = null
  private var pending: Promise? = null

  val isPlaying: Boolean
    @Synchronized get() = track != null

  @Synchronized
  fun play(pcm: ShortArray, sampleRate: Int, promise: Promise) {
    stop()
    val attributes = AudioAttributes.Builder()
      .setUsage(AudioAttributes.USAGE_VOICE_COMMUNICATION)
      .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
      .build()
    val format = AudioFormat.Builder()
      .setEncoding(AudioFormat.ENCODING_PCM_16BIT)
      .setSampleRate(sampleRate)
      .setChannelMask(AudioFormat.CHANNEL_OUT_MONO)
      .build()
    val created = AudioTrack.Builder()
      .setAudioAttributes(attributes)
      .setAudioFormat(format)
      .setTransferMode(AudioTrack.MODE_STATIC)
      .setBufferSizeInBytes(maxOf(pcm.size, 1) * 2)
      .build()
    created.write(pcm, 0, pcm.size)
    created.notificationMarkerPosition = maxOf(pcm.size, 1)
    created.setPlaybackPositionUpdateListener(object : AudioTrack.OnPlaybackPositionUpdateListener {
      override fun onMarkerReached(finished: AudioTrack) = finish(finished)
      override fun onPeriodicNotification(track: AudioTrack) = Unit
    })
    track = created
    pending = promise
    created.play()
  }

  @Synchronized
  fun stop() {
    val current = track ?: return
    track = null
    current.pause()
    current.flush()
    current.release()
    pending?.resolve(null)
    pending = null
  }

  @Synchronized
  private fun finish(finished: AudioTrack) {
    if (finished !== track) return
    stop()
  }
}
