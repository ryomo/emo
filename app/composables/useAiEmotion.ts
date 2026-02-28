import type { EmotionType, EmotionState } from '~/types/emotion'
import { EMOTION_EMOJI, EMOJI_TO_EMOTION } from '~/types/emotion'

/**
 * AI 感情状態管理コンポーザブル
 *
 * AI の応答テキストに含まれる絵文字から感情を検出する。
 */
export function useAiEmotion() {
  const emotionState = ref<EmotionState>({
    current: 'neutral',
    previous: 'neutral',
  })

  const currentEmoji = computed(() => EMOTION_EMOJI[emotionState.value.current])

  /** 感情を直接設定する */
  function setEmotion(emotion: EmotionType) {
    if (emotion === emotionState.value.current) return
    emotionState.value.previous = emotionState.value.current
    emotionState.value.current = emotion
  }

  /**
   * テキスト内の EMOTION_EMOJI 絵文字を検出し、最後に見つかった絵文字の感情を設定する。
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
