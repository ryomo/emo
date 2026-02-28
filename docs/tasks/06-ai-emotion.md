# Task 06: AI 感情表現

## 概要

システムプロンプトで AI に感情絵文字を応答に含めるよう指示し、応答テキスト内の絵文字を検出して画面上の表情を動的に切り替える。

> **実装方針について**
> 当初は Tool Calling による感情設定を検討したが、Lemonade Server + `Gemma-3-4b-it-GGUF` の組み合わせでは Tool Calling が安定しなかったため、
> システムプロンプト指示 + 応答テキスト内の絵文字検出方式を採用した。

## 感情の定義

| 感情 ID | 表示絵文字 | 説明 |
|--------|-----------|------|
| `happy` | 😊 | 喜び・うれしい |
| `sad` | 😢 | 悲しみ |
| `angry` | 😠 | 怒り |
| `surprised` | 😲 | 驚き |
| `thinking` | 🤔 | 考え中・思案 |
| `neutral` | 😐 | 通常・特になし |

## サブタスク

### 6-1. 型定義 (`app/types/emotion.ts`)

```ts
type EmotionType = 'happy' | 'sad' | 'angry' | 'surprised' | 'thinking' | 'neutral'

const EMOTION_EMOJI: Record<EmotionType, string> = {
  happy: '😊', sad: '😢', angry: '😠',
  surprised: '😲', thinking: '🤔', neutral: '😐',
}

// 絵文字 → 感情の逆引きマップ
const EMOJI_TO_EMOTION: Record<string, EmotionType>

// テキストから感情絵文字を除去するユーティリティ
function stripEmotionEmoji(text: string): string
```

### 6-2. システムプロンプトによる絵文字指示

`useChatApi.ts` のシステムプロンプトに、`EMOTION_EMOJI` に含まれる絵文字を毎回応答の先頭に付けるよう指示を追加する。

### 6-3. composable の実装 (`app/composables/useAiEmotion.ts`)

- `emotionState`: 現在・前回の感情（`ref<EmotionState>`）
- `currentEmoji`: 現在の絵文字（`computed`）
- `detectEmotionFromText(text: string)`: テキスト内の `EMOTION_EMOJI` 絵文字を検出し、最後に見つかった絵文字の感情を設定する

### 6-4. チャット履歴での絵文字除去

- `ChatHistory.vue` で assistant メッセージを表示する際、`stripEmotionEmoji()` で感情絵文字を除去する
- 感情絵文字は `EmotionDisplay.vue` のみに表示される

### 6-5. 表情エリアとの接続

- `EmotionDisplay.vue` が `emotionState.current` を受け取り表示
- 感情が変わるときに Vue `<Transition>` によるフェードアニメーション
- `index.vue` で `messages.length` を watch し、assistant の新着メッセージから `detectEmotionFromText()` を呼び出す

## 完了条件

- AI の返答に応じて表情絵文字が自動的に切り替わる ✅
- 感情絵文字はチャット履歴には表示されない ✅
- 感情切り替え時にアニメーションが付く ✅
