# Task 02: チャット API 連携

## 概要

Lemonade Server の `/api/v1/chat/completions` エンドポイントを使い、LLM との会話機能を実装する。
本タスクは Task 06 (AI 感情表現) の前提となる。

## API 仕様

- **エンドポイント**: `POST /api/v1/chat/completions`
- **リクエスト例**:
  ```json
  {
    "model": "Gemma-3-4b-it-GGUF",
    "messages": [
      { "role": "system", "content": "You are a helpful assistant." },
      { "role": "user", "content": "こんにちは" }
    ]
  }
  ```
- **レスポンス**: OpenAI Chat Completions API 互換形式

## サブタスク

### 2-1. 型定義 (`app/types/chat.ts`)

```ts
type ChatRole = 'system' | 'user' | 'assistant' | 'tool'

interface ChatMessage {
  role: ChatRole
  content: string
  tool_calls?: ToolCall[]  // assistant からの Tool Call
  tool_call_id?: string    // tool ロールのときに使用
}

interface ToolCall {
  id: string
  type: 'function'
  function: {
    name: string
    arguments: string  // JSON 文字列
  }
}
```

### 2-2. composable の実装 (`app/composables/useChatApi.ts`)

以下の機能を持つ composable を実装する。

- `messages`: 会話履歴（`ref<ChatMessage[]>`）
- `isLoading`: API 呼び出し中フラグ
- `sendMessage(userText: string)`: ユーザーメッセージを追加して API 呼び出し
- `clearHistory()`: 会話履歴をリセット
- システムプロンプトで「応答は短くする」よう指示する

### 2-3. システムプロンプトの設定

音声会話を想定し、以下の方針でシステムプロンプトを設定する。

- 応答は 1〜3 文程度に収める
- Tool Calling のツール定義を含める（Task 06 で追加）

### 2-4. チャット UI コンポーネントへの組み込み

- `ChatWindow.vue`: メッセージ一覧を表示（user / assistant を区別）
- `ChatInput.vue`: テキスト送信フォーム。`sendMessage` を呼び出す

## 完了条件

- テキストを入力して送信すると、AI の応答がチャット画面に表示される
- 会話履歴が正しく積み上がり、文脈を保って会話できる
- ローディング中は入力を無効化する
