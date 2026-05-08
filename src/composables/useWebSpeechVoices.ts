/**
 * Composable for Web Speech voice catalog management.
 *
 * Keeps voice discovery/filter/default-picking in one place so
 * speech execution logic can stay focused in useWebSpeechSpeak.
 */

import { SPEECH_LANGUAGE_TO_LOCALE } from '~/composables/useSpeechLanguage'

const allVoices = ref<SpeechSynthesisVoice[]>([])
const isReady = ref(false)
let initialized = false

function normalizePrimaryTag(tag: string): string {
  return tag.toLowerCase().split('-')[0] || ''
}

export function getLocaleForSpeechLanguage(speechLanguage: string): string {
  return SPEECH_LANGUAGE_TO_LOCALE[speechLanguage] || 'en'
}

function updateVoices() {
  if (!import.meta.client || !('speechSynthesis' in globalThis)) return
  allVoices.value = globalThis.speechSynthesis.getVoices()
  isReady.value = allVoices.value.length > 0
}

function ensureVoicePolling() {
  if (!import.meta.client || !('speechSynthesis' in globalThis)) return

  let tries = 0
  const maxTries = 8
  const timer = globalThis.setInterval(() => {
    updateVoices()
    tries += 1
    if (isReady.value || tries >= maxTries) {
      globalThis.clearInterval(timer)
    }
  }, 250)
}

export function getVoicesForSpeechLanguage(voices: SpeechSynthesisVoice[], speechLanguage: string): SpeechSynthesisVoice[] {
  const locale = getLocaleForSpeechLanguage(speechLanguage)
  const target = normalizePrimaryTag(locale)
  return voices.filter((voice) => {
    const voicePrimary = normalizePrimaryTag(voice.lang)
    return voicePrimary === target
  })
}

export function pickDefaultVoiceForSpeechLanguage(voices: SpeechSynthesisVoice[], speechLanguage: string): SpeechSynthesisVoice | null {
  const localized = getVoicesForSpeechLanguage(voices, speechLanguage)
  if (localized.length > 0) {
    const preferred = localized.find(v => v.default)
    if (preferred) return preferred
    return localized[0] ?? null
  }
  const fallback = voices.find(v => v.default)
  if (fallback) return fallback
  return voices[0] ?? null
}

export function useWebSpeechVoices() {
  if (import.meta.client && !initialized) {
    initialized = true
    updateVoices()
    globalThis.speechSynthesis.addEventListener('voiceschanged', updateVoices)
    ensureVoicePolling()
  }

  return {
    allVoices: readonly(allVoices),
    isReady: readonly(isReady),
    getVoicesForSpeechLanguage: (speechLanguage: string) => getVoicesForSpeechLanguage(allVoices.value, speechLanguage),
    pickDefaultVoiceForSpeechLanguage: (speechLanguage: string) => pickDefaultVoiceForSpeechLanguage(allVoices.value, speechLanguage),
  }
}
