/**
 * Chat API composable using WebGPU (Gemma-4-E2B-it-ONNX via transformers.js).
 *
 * Provides the same interface as useLemonadeChat (Lemonade Server),
 * but runs inference entirely on-device using WebGPU.
 */

import type { ChatMessage } from '~/types/chat'
import { EMOTION_EMOJI } from '~/types/emotion'

const LOG_PREFIX = '[WebGPU Chat]'

/** Generate emoji list from EMOTION_EMOJI for use in prompt */
const EMOJI_LIST = Object.values(EMOTION_EMOJI).join(' ')

/** Build full system prompt from user-configured base + emotion emoji instruction */
function buildSystemPrompt(basePrompt: string): string {
  const emojiInstruction
    = `- Always start your response with exactly one of the following emojis`
      + ` to express your current emotion: ${EMOJI_LIST}`
  return `${basePrompt}\n${emojiInstruction}`
}

/** Strip thinking channel blocks from model output */
function stripThinkingContent(text: string): string {
  return text.replaceAll(/<\|channel>thought\n[\s\S]*?<channel\|>/g, '').trim()
}

/**
 * Composable for WebGPU-based Chat API
 */
// --------------- Module-level KV cache ---------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _cachedKv: any = null

export function useWebGpuChat() {
  const config = useConfig()
  const { isLoaded, loadModel, getProcessor, getModel, withGpuLock } = useWebGpuModel()

  const messages = ref<ChatMessage[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  /** Return array including system prompt with message history */
  function buildRequestMessages(): { role: string, content: string }[] {
    const maxMessagesToInclude = 10 // Limit number of recent messages to include in prompt for performance
    const recentMessages = messages.value.slice(-maxMessagesToInclude)
    return [
      { role: 'system', content: buildSystemPrompt(config.systemPrompt) },
      ...recentMessages
        .filter(m => m.content != null)
        .map(m => ({ role: m.role, content: m.content! })),
    ]
  }

  /** Add user message, run local model inference, and add response to history */
  async function sendMessage(userText: string) {
    if (!userText.trim() || isLoading.value) return

    messages.value.push({ role: 'user', content: userText })
    isLoading.value = true
    error.value = null

    try {
      if (!isLoaded.value) {
        await loadModel()
      }

      const processor = getProcessor()
      const model = getModel()
      if (!processor || !model) {
        throw new Error('WebGPU model is not loaded')
      }

      const requestMessages = buildRequestMessages()

      // Build prompt via chat template
      const prompt = processor.apply_chat_template(requestMessages, {
        enable_thinking: config.enableThinking,
        add_generation_prompt: true,
      })

      // Tokenize (text-only, no image/audio)
      const inputs = await processor(prompt, null, null, { add_special_tokens: false })

      // KV cache is only valid when thinking is disabled
      const canUseCache = !config.enableThinking

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result: any = await withGpuLock(() => model.generate({
        ...inputs,
        return_dict_in_generate: true,
        past_key_values: canUseCache ? (_cachedKv ?? undefined) : undefined,
        max_new_tokens: 1024,
        do_sample: true,
        temperature: 1,
        top_p: 0.95,
        top_k: 64,
      }))

      _cachedKv = canUseCache ? result.past_key_values : null

      // Decode only generated tokens (strip prompt)
      const decoded = processor.batch_decode(
        result.sequences.slice(null, [inputs.input_ids.dims.at(-1), null]),
        { skip_special_tokens: true },
      )

      const resultText = stripThinkingContent(decoded[0] ?? '')

      if (resultText) {
        messages.value.push({ role: 'assistant', content: resultText })
      }

      console.log(LOG_PREFIX, '✅ Response generated:', resultText.slice(0, 100))
    }
    catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      error.value = msg
      console.error(LOG_PREFIX, '❌ Generation error:', e)
    }
    finally {
      isLoading.value = false
    }
  }

  /** Reset conversation history and KV cache */
  function clearHistory() {
    messages.value = []
    error.value = null
    _cachedKv = null
  }

  return {
    messages: readonly(messages),
    isLoading: readonly(isLoading),
    error: readonly(error),
    sendMessage,
    clearHistory,
  }
}
