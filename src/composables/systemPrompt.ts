import { EMOTION_EMOJI } from '~/types/emotion'

/** Generate emoji list from EMOTION_EMOJI for use in prompt */
const EMOJI_VALUES = Object.values(EMOTION_EMOJI) as string[]
export const EMOJI_LIST = EMOJI_VALUES.join(' ')

/** Build full system prompt from user-configured base + optional camera + emoji instruction */
export function buildSystemPrompt(basePrompt: string, cameraContextInstruction: string, hasImage: boolean): string {
  const trimmedCameraInstruction = cameraContextInstruction.trim()
  const cameraInstruction = hasImage && trimmedCameraInstruction
    ? `\n${trimmedCameraInstruction}`
    : ''
  const emojiInstruction = `\n- Always start your response with exactly one of the following emojis`
    + ` to express your current emotion: ${EMOJI_LIST}`
  return `${basePrompt}${cameraInstruction}${emojiInstruction}`
}
