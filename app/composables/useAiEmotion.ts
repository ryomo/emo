import type { EmotionType, EmotionState } from '~/types/emotion'
import { EMOTION_EMOJI, EMOJI_TO_EMOTION } from '~/types/emotion'

/**
 * Composable for AI emotion state management
 *
 * Detects emotions from emojis included in AI response text.
 */
export function useAiEmotion() {
  const emotionState = ref<EmotionState>({
    current: 'neutral',
    previous: 'neutral',
  })

  const currentEmoji = computed(() => EMOTION_EMOJI[emotionState.value.current])

  /** Set emotion directly */
  function setEmotion(emotion: EmotionType) {
    if (emotion === emotionState.value.current) return
    emotionState.value.previous = emotionState.value.current
    emotionState.value.current = emotion
  }

  /**
   * Detects EMOTION_EMOJI emojis in text and sets the emotion of the last found emoji.
   */
  function detectEmotionFromText(text: string) {
    let lastEmotion: EmotionType | null = null
    let lastIndex = -1

    for (const [emoji, emotion] of Object.entries(EMOJI_TO_EMOTION)) {
      const idx = text.lastIndexOf(emoji)
      if (idx !== -1 && idx > lastIndex) {
        lastIndex = idx
        lastEmotion = emotion
      }
    }

    if (lastEmotion) {
      setEmotion(lastEmotion)
    }
  }

  return {
    emotionState: readonly(emotionState),
    currentEmoji,
    setEmotion,
    detectEmotionFromText,
  }
}
