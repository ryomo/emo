import type { ChatMessage, ChatCompletionResponse } from '~/types/chat'
import { EMOTION_EMOJI } from '~/types/emotion'

/** Generate emoji list from EMOTION_EMOJI for use in prompt */
const EMOJI_LIST = Object.values(EMOTION_EMOJI).join(' ')

/** System prompt: Assumes voice conversation and encourages short responses */
const SYSTEM_PROMPT = `You are a helpful AI assistant.
Please follow these rules when responding:
- Keep responses to 1-3 sentences
- Answer clearly and concisely
- Avoid lengthy explanations as this is designed for voice conversation
- Always start your response with exactly one of the following emojis to express your current emotion: ${EMOJI_LIST}`

/**
 * Composable for Chat API calls
 */
export function useChatApi() {
  const config = useConfig()

  const messages = ref<ChatMessage[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  /** Return array including system prompt with message history */
  function buildRequestMessages(): ChatMessage[] {
    return [
      { role: 'system', content: SYSTEM_PROMPT },
      ...messages.value,
    ]
  }

  /** Add user message, call the API, and add response to history */
  async function sendMessage(userText: string) {
    if (!userText.trim() || isLoading.value) return

    messages.value.push({ role: 'user', content: userText })
    isLoading.value = true
    error.value = null

    try {
      const response = await $fetch<ChatCompletionResponse>(
        `${config.lemonadeBaseUrl}/api/v1/chat/completions`,
        {
          method: 'POST',
          body: {
            model: config.lemonadeModel,
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
      error.value = e?.data?.message || e?.message || 'API call failed'
      console.error('Chat API error:', e)
    } finally {
      isLoading.value = false
    }
  }

  /** Reset conversation history */
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
