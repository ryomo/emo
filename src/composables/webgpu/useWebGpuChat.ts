/**
 * Chat API composable using WebGPU (Gemma-4-E2B-it-ONNX via transformers.js).
 *
 * Runs inference entirely on-device using WebGPU.
 */

import type { ChatMessage } from '~/types/chat'
import type { Tensor } from '@huggingface/transformers'
import { load_image } from '@huggingface/transformers'
import { EMOTION_EMOJI } from '~/types/emotion'

const LOG_PREFIX = '[WebGPU Chat]'
const CAMERA_CONTEXT_INSTRUCTION = '- The attached image is a live image from the camera attached to you. Mention it only when it is required to answer the user\'s request.'

/** Generate emoji list from EMOTION_EMOJI for use in prompt */
const EMOJI_LIST = Object.values(EMOTION_EMOJI).join(' ')

/** Build full system prompt from user-configured base + emotion emoji instruction */
function buildSystemPrompt(basePrompt: string, hasImage: boolean): string {
  const cameraInstruction = hasImage ? `\n${CAMERA_CONTEXT_INSTRUCTION}` : ''
  const emojiInstruction = `\n- Always start your response with exactly one of the following emojis`
    + ` to express your current emotion: ${EMOJI_LIST}`
  return `${basePrompt}${cameraInstruction}${emojiInstruction}`
}

/** Strip thinking channel blocks from model output */
function stripThinkingContent(text: string): string {
  return text.replaceAll(/<\|channel>thought\n[\s\S]*?<channel\|>/g, '').trim()
}

/**
 * Composable for WebGPU-based Chat API
 */
export function useWebGpuChat() {
  const config = useConfig()
  const { isLoaded, loadModel, getProcessor, getModel, withGpuLock } = useWebGpuModel()

  const messages = ref<ChatMessage[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  type ChatRequestContentPart = { type: 'image' } | { type: 'text', text: string }

  interface ChatRequestMessage {
    role: 'system' | 'user' | 'assistant'
    content: string | ChatRequestContentPart[]
  }

  /** Return array including system prompt with message history */
  function buildRequestMessages(userText: string, hasImage: boolean): ChatRequestMessage[] {
    const maxMessagesToInclude = 9 // Reserve one slot for the current user turn
    const recentMessages = messages.value.slice(-maxMessagesToInclude)

    const history: ChatRequestMessage[] = recentMessages
      .filter(m => m.content != null && (m.role === 'user' || m.role === 'assistant'))
      .map(m => ({ role: m.role, content: m.content! }))

    const currentUserContent: string | ChatRequestContentPart[] = hasImage
      ? [{ type: 'image' }, { type: 'text', text: userText }]
      : userText

    return [
      { role: 'system', content: buildSystemPrompt(config.systemPrompt, hasImage) },
      ...history,
      { role: 'user', content: currentUserContent },
    ]
  }

  /** Add user message, run local model inference, and add response to history */
  async function sendMessage(userText: string, userImage?: Blob | null) {
    if (!userText.trim() || isLoading.value) return

    const trimmedText = userText.trim()

    const requestMessages = buildRequestMessages(trimmedText, Boolean(userImage))
    messages.value.push({ role: 'user', content: trimmedText })

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

      // Build prompt via chat template
      const prompt = processor.apply_chat_template(requestMessages, {
        add_generation_prompt: true,
      })

      let imageInput: unknown = null
      let imageObjectUrl: string | null = null
      try {
        if (userImage) {
          imageObjectUrl = URL.createObjectURL(userImage)
          imageInput = await load_image(imageObjectUrl)
        }

        // Tokenize (text/image, no audio)
        const inputs = await processor(prompt, imageInput, null, { add_special_tokens: false })

        const result = await withGpuLock(() => model.generate({
          ...inputs,
          return_dict_in_generate: true,
          max_new_tokens: 1024,
          do_sample: true,
          temperature: 1,
          top_p: 0.95,
          top_k: 64,
        }))

        if (!('sequences' in result)) {
          throw new Error('Unexpected generation output format: sequences is missing')
        }
        const sequences = result.sequences as Tensor

        // Decode only generated tokens (strip prompt)
        const decoded = processor.batch_decode(
          sequences.slice(null, [inputs.input_ids.dims.at(-1), null]),
          { skip_special_tokens: true },
        )

        const resultText = stripThinkingContent(decoded[0] ?? '')

        if (resultText) {
          messages.value.push({ role: 'assistant', content: resultText })
        }

        console.log(LOG_PREFIX, '✅ Response generated:', resultText.slice(0, 100))
      }
      finally {
        if (imageObjectUrl) {
          URL.revokeObjectURL(imageObjectUrl)
        }
      }
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
