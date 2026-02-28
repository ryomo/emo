/** AI の感情タイプ */
export type EmotionType =
  | 'neutral'
  | 'happy'
  | 'sad'
  | 'angry'
  | 'surprised'
  | 'thinking'

/** 感情 → 絵文字マッピング */
export const EMOTION_EMOJI: Record<EmotionType, string> = {
  neutral: '😐',
  happy: '😊',
  sad: '😢',
  angry: '😠',
  surprised: '😲',
  thinking: '🤔',
}

/** 絵文字 → 感情の逆引きマップ */
export const EMOJI_TO_EMOTION: Record<string, EmotionType> = Object.fromEntries(
  Object.entries(EMOTION_EMOJI).map(([emotion, emoji]) => [emoji, emotion as EmotionType]),
) as Record<string, EmotionType>

/** テキストから EMOTION_EMOJI の絵文字を除去する */
const EMOTION_EMOJI_REGEX = new RegExp(
  Object.values(EMOTION_EMOJI).join('|'),
  'g',
)
export function stripEmotionEmoji(text: string): string {
  return text.replaceAll(EMOTION_EMOJI_REGEX, '').trim()
}

/** AI の感情状態 */
export interface EmotionState {
  current: EmotionType
  previous: EmotionType
}
