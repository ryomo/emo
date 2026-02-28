# Task 06: AI 感情表現 (Tool Calling)

## 概要

LLM の Tool Calling 機能を利用して、AI の返答内容に応じた感情（喜び・悲しみ・怒り・驚きなど）を検出し、画面上の表情絵文字を動的に切り替える。

## 前提確認事項

> **⚠️ 要動作確認**
> `Gemma-3-4b-it-GGUF` は仕様上 Tool Calling に対応しているとされるが、Lemonade Server の GUI では非対応として表示されている。
> 実装前に以下を確認すること。
> - `tools` パラメータを含むリクエストが正常に処理されるか
> - Tool Call のレスポンス（`tool_calls` フィールド）が返るか
> - 参考: [`server_models.json`](https://github.com/lemonade-sdk/lemonade/blob/main/src/cpp/resources/server_models.json)
>
> Tool Calling が動作しない場合は、応答テキストから感情キーワードを抽出するフォールバック実装を検討する。

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
  happy: '😊',
  sad: '😢',
  angry: '😠',
  surprised: '😲',
  thinking: '🤔',
  neutral: '😐',
}
```

### 6-2. Tool 定義の作成

チャット API リクエストに含める `tools` パラメータを定義する。

```json
{
  "type": "function",
  "function": {
    "name": "setEmotion",
    "description": "AIの現在の感情状態を設定する。会話の文脈に合わせて適切な感情を選択すること。",
    "parameters": {
      "type": "object",
      "properties": {
        "emotion": {
          "type": "string",
          "enum": ["happy", "sad", "angry", "surprised", "thinking", "neutral"],
          "description": "感情の種類"
        }
      },
      "required": ["emotion"]
    }
  }
}
```

### 6-3. composable の実装 (`app/composables/useAiEmotion.ts`)

- `currentEmotion`: 現在の感情（`ref<EmotionType>`、初期値 `neutral`）
- `currentEmoji`: 現在の絵文字（`computed`）
- `handleToolCall(toolCall: ToolCall)`: Tool Call を受け取り感情を更新する
  - `toolCall.function.name === 'setEmotion'` の場合に処理
  - フォールバック: Tool Calling 非対応時は応答テキストをキーワード検索で感情推定

### 6-4. チャット API との連携 (Task 02 の拡張)

`useChatApi.ts` を修正して以下を対応する:

1. リクエストに `tools` パラメータを追加
2. レスポンスの `choices[0].message.tool_calls` を確認
3. `setEmotion` の Tool Call があれば `handleToolCall()` を呼び出す
4. Tool Call を処理した後、必要であれば `tool` ロールのメッセージを追加して続きの応答を取得する

### 6-5. 表情エリアとの接続

- `EmotionDisplay.vue` が `currentEmotion` / `currentEmoji` を受け取り表示
- 感情が変わるときにフェードアニメーションを付ける（CSS transition）

## 完了条件

- AI の返答に応じて表情絵文字が自動的に切り替わる
- Tool Calling が動作することを実機で確認済み
- Tool Calling が動作しない場合のフォールバックが実装されている（オプション）
