import type { EmotionType, EmotionState } from '~/types/emotion'

/**
 * AI 感情状態管理コンポーザブル (Task 06 で実装)
 */
export function useAiEmotion() {
  const emotionState = ref<EmotionState>({
    current: 'neutral',
    previous: 'neutral',
  })

  // TODO: Task 06 で実装
  function setEmotion(emotion: EmotionType) {
    emotionState.value.previous = emotionState.value.current
    emotionState.value.current = emotion
  }

  return {
    emotionState: readonly(emotionState),
    setEmotion,
  }
}
