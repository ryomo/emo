import type { ChatMessage, ChatCompletionResponse } from '~/types/chat'
import { EMOTION_EMOJI } from '~/types/emotion'

/** Generate emoji list from EMOTION_EMOJI for use in prompt */
const EMOJI_LIST = Object.values(EMOTION_EMOJI).join(' ')

/** Build full system prompt from user-configured base + emotion emoji instruction */
function buildSystemPrompt(basePrompt: string): string {
  const emojiInstruction
    = `- Always start your response with exactly one of the following emojis`
      + ` to express your current emotion: ${EMOJI_LIST}`
  return `${basePrompt}\n${emojiInstruction}`
}

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
      { role: 'system', content: buildSystemPrompt(config.systemPrompt) },
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
            enable_thinking: config.enableThinking,
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
    }
    catch (e: unknown) {
      const err = e as { data?: { message?: string }, message?: string }
      error.value = err?.data?.message || err?.message || 'API call failed'
      console.error('Chat API error:', e)
    }
    finally {
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
