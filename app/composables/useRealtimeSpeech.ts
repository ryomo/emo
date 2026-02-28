/**
 * WebSocket 音声認識コンポーザブル (Task 04 で実装)
 */
export function useRealtimeSpeech() {
  const config = useRuntimeConfig()
  const isListening = ref(false)
  const transcript = ref('')

  // TODO: Task 04 で実装
  function start() {
    console.log('start: Task 04 で実装予定', config.public.lemonadeBaseUrl)
  }

  function stop() {
    isListening.value = false
  }

  return {
    isListening,
    transcript,
    start,
    stop,
  }
}
