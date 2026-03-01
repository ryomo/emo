/** AI emotion type */
export type EmotionType =
  | 'neutral'
  | 'happy'
  | 'sad'
  | 'angry'
  | 'surprised'
  | 'thinking'

/** Emotion → emoji mapping */
export const EMOTION_EMOJI: Record<EmotionType, string> = {
  neutral: '😐',
  happy: '😊',
  sad: '😢',
  angry: '😠',
  surprised: '😲',
  thinking: '🤔',
}

/** Reverse lookup map: emoji → emotion */
export const EMOJI_TO_EMOTION: Record<string, EmotionType> = Object.fromEntries(
  Object.entries(EMOTION_EMOJI).map(([emotion, emoji]) => [emoji, emotion as EmotionType]),
) as Record<string, EmotionType>

/** Remove EMOTION_EMOJI emojis from text */
const EMOTION_EMOJI_REGEX = new RegExp(
  Object.values(EMOTION_EMOJI).join('|'),
  'g',
)
export function stripEmotionEmoji(text: string): string {
  return text.replaceAll(EMOTION_EMOJI_REGEX, '').trim()
}

/** AI emotion state */
export interface EmotionState {
  current: EmotionType
  previous: EmotionType
}
