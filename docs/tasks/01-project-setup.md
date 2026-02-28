# Task 01: プロジェクトセットアップ

## 概要

Nuxt3 プロジェクトとしての基盤を整える。依存ライブラリの追加、ディレクトリ構成の整備、環境変数の設定を行う。

## サブタスク

### 1-1. 依存ライブラリの追加

以下のライブラリの追加を検討する。

| ライブラリ | 用途 | 備考 |
|-----------|------|------|
| `@nuxtjs/tailwindcss` または `unocss` | スタイリング | どちらか選択 |

> その他のライブラリは各タスクで必要に応じて追加する。Nuxt3 の組み込み機能（`useFetch`, `useWebSocket` 等）をできる限り活用する方針とする。

### 1-2. ディレクトリ構成の整備

以下の構成を目安に `app/` 配下を整備する。

```
app/
  app.vue
  pages/
    index.vue          # チャット・音声会話メイン画面
  components/
    chat/
      ChatHistory.vue   # チャットメッセージ表示
      ChatInput.vue    # テキスト入力フォーム
    voice/
      VoiceButton.vue  # 音声会話 開始/停止ボタン
      TranscriptArea.vue # 音声認識テキスト表示エリア
    emotion/
      EmotionDisplay.vue # AI 表情表示エリア
  composables/
    useChatApi.ts        # チャット API 呼び出し (Task 02)
    useTtsApi.ts         # TTS API 呼び出し (Task 03)
    useRealtimeSpeech.ts # WebSocket 音声認識 (Task 04)
    useAiEmotion.ts      # AI 感情状態管理 (Task 06)
  types/
    chat.ts              # メッセージ型・Tool Call 型等
    emotion.ts           # 感情の型定義
```

### 1-3. 環境変数の設定

`.env` ファイルを作成し、以下の変数を定義する。

```env
NUXT_PUBLIC_LEMONADE_BASE_URL=http://localhost:8000
NUXT_PUBLIC_LEMONADE_MODEL=Gemma-3-4b-it-GGUF
```

`nuxt.config.ts` で `runtimeConfig.public` に読み込む設定を追加する。

```ts
runtimeConfig: {
  public: {
    lemonadeBaseUrl: '',  // .env の NUXT_PUBLIC_LEMONADE_BASE_URL で上書き
    lemonadeModel: '',
  }
}
```

### 1-4. TypeScript 型定義の作成

`app/types/` に共通型を定義する。

- `ChatMessage` / `ChatRole` / `ToolCall` / `ToolFunction` など（Task 02 で詳細化）
- `EmotionType`（Task 06 で詳細化）

## 完了条件

- `npm run dev` でエラーなく起動する
- `http://localhost:3000` にアクセスして画面が表示される
- 環境変数が `useRuntimeConfig()` から参照できる
