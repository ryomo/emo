import type { ChatMessage, ChatCompletionResponse } from '~/types/chat'
import { EMOTION_EMOJI } from '~/types/emotion'

/** EMOTION_EMOJI の絵文字一覧をプロンプト用に生成 */
const EMOJI_LIST = Object.values(EMOTION_EMOJI).join(' ')

/** システムプロンプト: 音声会話を想定し短い応答を促す */
const SYSTEM_PROMPT = `あなたは親切なAIアシスタントです。
以下のルールを守って回答してください:
- 応答は1〜3文程度に収めてください
- 簡潔でわかりやすい日本語で答えてください
- 音声での会話を想定しているため、冗長な説明は避けてください
- 毎回必ず、応答の先頭に以下の絵文字のいずれか1つを付けて、あなたの今の感情を表現してください: ${EMOJI_LIST}`

/**
 * チャット API 呼び出し用コンポーザブル
 */
export function useChatApi() {
  const config = useRuntimeConfig()

  const messages = ref<ChatMessage[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  /** メッセージ履歴にシステムプロンプトを含めた配列を返す */
  function buildRequestMessages(): ChatMessage[] {
    return [
      { role: 'system', content: SYSTEM_PROMPT },
      ...messages.value,
    ]
  }

  /** ユーザーメッセージを追加して API を呼び出し、応答を履歴に追加する */
  async function sendMessage(userText: string) {
    if (!userText.trim() || isLoading.value) return

    messages.value.push({ role: 'user', content: userText })
    isLoading.value = true
    error.value = null

    try {
      const response = await $fetch<ChatCompletionResponse>(
        `${config.public.lemonadeBaseUrl}/api/v1/chat/completions`,
        {
          method: 'POST',
          body: {
            model: config.public.lemonadeModel,
            messages: buildRequestMessages(),
          },
        },
      )

      const assistantMessage = response.choices?.[0]?.message
      if (assistantMessage) {
        messages.value.push({
          role: 'assistant',
          content: assistantMessage.content,
        })
      }
    } catch (e: any) {
      error.value = e?.data?.message || e?.message || 'API 呼び出しに失敗しました'
      console.error('Chat API error:', e)
    } finally {
      isLoading.value = false
    }
  }

  /** 会話履歴をリセットする */
  function clearHistory() {
    messages.value = []
    error.value = null
  }

  return {
    messages: readonly(messages),
    isLoading: readonly(isLoading),
    error: readonly(error),
    sendMessage,
    clearHistory,
  }
}
