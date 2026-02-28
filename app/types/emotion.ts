/** AI の感情タイプ */
export type EmotionType =
  | 'neutral'
  | 'happy'
  | 'sad'
  | 'angry'
  | 'surprised'
  | 'thinking'

/** AI の感情状態 */
export interface EmotionState {
  current: EmotionType
  previous: EmotionType
}
