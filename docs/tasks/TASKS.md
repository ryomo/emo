# 実装タスク一覧

Lemonade Server をバックエンドとした、Nuxt3 製 AI チャット・音声会話フロントエンドの実装タスク。

## タスク概要

| # | タスク名 | 説明 | 状態 |
|---|---------|------|------|
| [01](./01-project-setup.md) | プロジェクトセットアップ | ディレクトリ構成・依存ライブラリ・環境変数の整備 | 完了 |
| [02](./02-chat-api.md) | チャット API 連携 | `/api/v1/chat/completions` を用いた会話機能 | 未着手 |
| [03](./03-tts-api.md) | テキスト音声合成 (TTS) | `/api/v1/audio/speech` を用いた AI 応答の読み上げ | 未着手 |
| [04](./04-realtime-speech.md) | リアルタイム音声認識 | `/realtime` WebSocket を用いたユーザー発話のテキスト化 | 未着手 |
| [05](./05-ui-layout.md) | UI レイアウト | チャット画面・表情エリア・音声ボタン等の画面構築 | 未着手 |
| [06](./06-ai-emotion.md) | AI 感情表現 (Tool Calling) | LLM の Tool Calling で AI の表情を動的に切り替える | 未着手 |

## 依存関係

```
01 (セットアップ)
 ├─ 02 (チャット API)
 │   └─ 06 (AI 感情表現)  ← Tool Calling は 02 の拡張
 ├─ 03 (TTS)
 ├─ 04 (リアルタイム音声認識)
 └─ 05 (UI レイアウト)    ← 02〜04・06 の UI を統合
```

## 前提条件

- Lemonade Server がローカルで起動していること（デフォルト: `http://localhost:8000`）
- 使用モデル例: `Gemma-3-4b-it-GGUF`
  - Tool Calling の動作確認が必要（[詳細は Task 06](./tasks/06-ai-emotion.md) 参照）
