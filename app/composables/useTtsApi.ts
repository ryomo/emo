const TTS_LOG_PREFIX = '[TTS]'

/**
 * TTS API 呼び出し用コンポーザブル
 *
 * Lemonade Server の POST /api/v1/audio/speech を使い、
 * テキストを音声に変換して再生する。
 */
export function useTtsApi() {
  const config = useRuntimeConfig()
  const isSpeaking = ref(false)

  let currentAudio: HTMLAudioElement | null = null
  let currentObjectUrl: string | null = null

  /** 再生中の音声を停止し、リソースを解放する */
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
   * テキストを TTS API で音声に変換して再生する。
   * 連続呼び出し時は前の音声を停止してから次を再生する。
   */
  async function speak(text: string) {
    if (!text.trim()) return

    // 前の音声を停止
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
          }),
        },
      )

      if (!response.ok) {
        throw new Error(`TTS API error: ${response.status} ${response.statusText}`)
      }

      const blob = await response.blob()
      const objectUrl = URL.createObjectURL(blob)
      currentObjectUrl = objectUrl

      const audio = new Audio(objectUrl)
      currentAudio = audio

      isSpeaking.value = true
      console.log(TTS_LOG_PREFIX, '▶️ Playing audio')

      audio.onended = () => {
        console.log(TTS_LOG_PREFIX, '✅ Playback finished')
        // 別の再生に差し替わっていなければクリーンアップ
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
