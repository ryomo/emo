import type { ChatMessage } from '~/types/chat'

/**
 * チャット API 呼び出し用コンポーザブル (Task 02 で実装)
 */
export function useChatApi() {
  const config = useRuntimeConfig()

  const messages = ref<ChatMessage[]>([])
  const isLoading = ref(false)

  // TODO: Task 02 で実装
  async function sendMessage(_content: string) {
    console.log('sendMessage: Task 02 で実装予定', config.public.lemonadeBaseUrl)
  }

  return {
    messages,
    isLoading,
    sendMessage,
  }
}
