/**
 * TTS API 呼び出し用コンポーザブル (Task 03 で実装)
 */
export function useTtsApi() {
  const config = useRuntimeConfig()
  const isSpeaking = ref(false)

  // TODO: Task 03 で実装
  async function speak(_text: string) {
    console.log('speak: Task 03 で実装予定', config.public.lemonadeBaseUrl)
  }

  function stop() {
    isSpeaking.value = false
  }

  return {
    isSpeaking,
    speak,
    stop,
  }
}
