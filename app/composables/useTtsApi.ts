const TTS_LOG_PREFIX = '[TTS]'

/**
 * Composable for TTS API calls
 *
 * Uses Lemonade Server's POST /api/v1/audio/speech
 * to convert text to speech and play it.
 */
export function useTtsApi() {
  const config = useRuntimeConfig()
  const isSpeaking = ref(false)

  let currentAudio: HTMLAudioElement | null = null
  let currentObjectUrl: string | null = null

  /** Stop currently playing audio and release resources */
  function stop() {
    if (currentAudio) {
      currentAudio.pause()
      currentAudio.removeAttribute('src')
      currentAudio.load()
      currentAudio = null
    }
    if (currentObjectUrl) {
      URL.revokeObjectURL(currentObjectUrl)
      currentObjectUrl = null
    }
    isSpeaking.value = false
  }

  /**
   * Convert text to speech via TTS API and play it.
   * If called consecutively, stops the previous audio before playing the next.
   */
  async function speak(text: string) {
    if (!text.trim()) return

    // Stop previous audio
    stop()

    console.log(TTS_LOG_PREFIX, '🔊 Requesting speech for:', text.slice(0, 50))

    try {
      const response = await fetch(
        `${config.public.lemonadeBaseUrl}/api/v1/audio/speech`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: config.public.lemonadeTtsModel,
            input: text,
            voice: 'af_heart',
            response_format: 'wav',
          }),
        },
      )

      if (!response.ok) {
        throw new Error(`TTS API error: ${response.status} ${response.statusText}`)
      }

      const rawBlob = await response.blob()

      // Guard against empty/tiny blob when server returns an error with status 200
      if (rawBlob.size < 100) {
        console.warn(TTS_LOG_PREFIX, `⚠️ Response blob too small (${rawBlob.size} bytes), skipping playback`)
        return
      }

      // Explicitly set audio MIME type in case Content-Type is incorrect
      const contentType = response.headers.get('Content-Type') || ''
      const isAudioMime = contentType.startsWith('audio/')
      const blob = isAudioMime
        ? rawBlob
        : new Blob([rawBlob], { type: 'audio/wav' })

      console.log(TTS_LOG_PREFIX, `📦 Audio blob: ${blob.size} bytes, type=${blob.type} (original: ${contentType})`)

      const objectUrl = URL.createObjectURL(blob)
      currentObjectUrl = objectUrl

      const audio = new Audio(objectUrl)
      currentAudio = audio

      isSpeaking.value = true
      console.log(TTS_LOG_PREFIX, '▶️ Playing audio')

      audio.onended = () => {
        console.log(TTS_LOG_PREFIX, '✅ Playback finished')
        // Clean up only if not replaced by another playback
        if (currentAudio === audio) {
          stop()
        }
      }

      audio.onerror = (e) => {
        console.error(TTS_LOG_PREFIX, '❌ Playback error:', e)
        if (currentAudio === audio) {
          stop()
        }
      }

      await audio.play()
    } catch (e: any) {
      console.error(TTS_LOG_PREFIX, '❌ TTS request failed:', e)
      stop()
    }
  }

  if (import.meta.client) {
    onUnmounted(() => {
      stop()
    })
  }

  return {
    isSpeaking: readonly(isSpeaking),
    speak,
    stop,
  }
}
