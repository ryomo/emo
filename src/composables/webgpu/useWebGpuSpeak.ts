/**
 * Composable for Web Speech TTS execution in WebGPU backend mode.
 *
 * Uses shared voice-selection helpers from useWebSpeechVoices,
 * while handling playback state and utterance lifecycle here.
 */

const LOG_PREFIX = '[WebSpeech Speak]'

/** Normalize input text for TTS */
function normalizeText(text: string): string {
  return text
    .replaceAll(/\p{Extended_Pictographic}/gu, '')
    .trim()
}

export function useWebGpuSpeak() {
  const config = useConfig()
  const { getVoicesForSpeechLanguage, pickDefaultVoiceForSpeechLanguage } = useWebSpeechVoices()
  const isSpeaking = ref(false)

  function stop() {
    if (!import.meta.client || !('speechSynthesis' in globalThis)) {
      isSpeaking.value = false
      return
    }
    globalThis.speechSynthesis.cancel()
    isSpeaking.value = false
  }

  function resolveVoice(): SpeechSynthesisVoice | null {
    const voicesForLanguage = getVoicesForSpeechLanguage(config.speechLanguage)
    const savedVoiceId = config.speechVoiceByLanguage[config.speechLanguage]
    const savedVoice = voicesForLanguage.find(v => v.voiceURI === savedVoiceId)
    if (savedVoice) {
      return savedVoice
    }
    return pickDefaultVoiceForSpeechLanguage(config.speechLanguage)
  }

  async function speak(text: string) {
    const normalized = normalizeText(text)
    if (!normalized) return

    if (!import.meta.client || !('speechSynthesis' in globalThis)) {
      console.warn(LOG_PREFIX, '⚠️ Web Speech API is unavailable')
      return
    }

    stop()

    const utterance = new SpeechSynthesisUtterance(normalized)
    const voice = resolveVoice()
    if (voice) {
      utterance.voice = voice
      utterance.lang = voice.lang
    }

    utterance.onend = () => {
      isSpeaking.value = false
    }

    utterance.onerror = (event) => {
      console.error(LOG_PREFIX, '❌ Speech synthesis error:', event.error)
      isSpeaking.value = false
    }

    console.log(LOG_PREFIX, '🔊 Speaking:', normalized.slice(0, 50), voice ? `voice=${voice.name}` : 'voice=default')
    isSpeaking.value = true
    globalThis.speechSynthesis.speak(utterance)
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
