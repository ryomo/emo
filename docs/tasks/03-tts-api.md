# Task 03: テキスト音声合成 (TTS) API 連携

## 概要

Lemonade Server の `/api/v1/audio/speech` エンドポイントを使い、AI の応答テキストを音声に変換して再生する。

## API 仕様

- **エンドポイント**: `POST /api/v1/audio/speech`
- **リクエスト例**:
  ```json
  {
    "model": "…",
    "input": "こんにちは、元気ですか？",
    "voice": "…"
  }
  ```
- **レスポンス**: 音声データ（バイナリ）。Content-Type は `audio/mpeg` 等を想定

> 詳細なリクエスト仕様は [Lemonade Server Docs](https://lemonade-server.ai/docs/server/server_spec/#endpoints-overview) を参照して確定させること。

## サブタスク

### 3-1. composable の実装 (`app/composables/useTtsApi.ts`)

以下の機能を持つ composable を実装する。

- `speak(text: string)`: テキストを受け取り、音声に変換して再生する
- `isSpeaking`: 音声再生中フラグ
- `stop()`: 再生中の音声を停止する
- Web Audio API または `<audio>` 要素を使った音声再生

実装の流れ:
1. API へ `fetch` でリクエスト
2. レスポンスを `Blob` として受け取る
3. `URL.createObjectURL(blob)` で再生用 URL を生成
4. `Audio` オブジェクトで再生、終了後に URL を revoke

### 3-2. チャット API との連携

- Task 02 の `sendMessage` が正常にレスポンスを受け取ったら、自動的に `speak()` を呼び出す
- AI の応答テキスト（`choices[0].message.content`）を渡す

### 3-3. 音声再生中の UI フィードバック

- 音声再生中は何らかの視覚的フィードバックを表示する（例: アイコンのアニメーション）

## 完了条件

- AI の応答が返ったとき、自動的に音声が再生される
- `stop()` で途中停止できる
- 連続して `speak()` が呼ばれた場合、前の音声を停止してから次を再生する
