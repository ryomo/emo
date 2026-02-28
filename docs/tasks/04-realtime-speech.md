# Task 04: リアルタイム音声認識 (WebSocket)

## 概要

Lemonade Server の `/realtime` WebSocket エンドポイントを使い、ユーザーのマイク入力をリアルタイムでテキスト化する。
OpenAI Realtime API 互換。モデルは **Whisper-Large-v3-Turbo** を使用。

## API 仕様

参考: [OpenAI Realtime Transcription](https://developers.openai.com/api/docs/guides/realtime-transcription)

- **エンドポイント**: `ws://localhost:8000/realtime`
- **プロトコル**: OpenAI Realtime API 互換（WebSocket、JSON イベントを送受信）
- **音声フォーマット**: PCM 16kHz モノラル 16bit（`audio/pcm`、rate=16000）
  - ブラウザのマイク入力（通常 44100 / 48000 Hz）は **16000 Hz にリサンプリング**して送信
  - 音声バイトは **Base64 エンコード**して送信
  - > ⚠️ **Lemonade Server の制約**: OpenAI 互換仕様では 24kHz もサポートするが、Lemonade Server は **16kHz mono PCM16 のみ**対応。

### セッション設定（接続直後に送信）

```json
{
  "type": "session.update",
  "session": {
    "type": "transcription",
    "audio": {
      "input": {
        "format": { "type": "audio/pcm", "rate": 16000 },
        "transcription": {
          "model": "Whisper-Large-v3-Turbo",
          "language": "ja"
        },
        "turn_detection": {
          "type": "server_vad",
          "threshold": 0.5,
          "prefix_padding_ms": 300,
          "silence_duration_ms": 500
        }
      }
    }
  }
}
```

### 音声データ送信（ストリーミング）

```json
{
  "type": "input_audio_buffer.append",
  "audio": "<Base64エンコードされたPCMバイト列>"
}
```

### 受信するサーバーイベント

| イベント | 説明 |
|---------|------|
| `session.created` | 接続確立、セッション初期化完了 |
| `input_audio_buffer.speech_started` | VAD が発話開始を検出 |
| `input_audio_buffer.speech_stopped` | VAD が発話終了を検出、自動コミット |
| `conversation.item.input_audio_transcription.delta` | 認識テキストの増分（**Whisper では `completed` と同内容**） |
| `conversation.item.input_audio_transcription.completed` | 1 ターン分の確定テキスト（`transcript` フィールドに全文） |
| `error` | エラー |

> **Note**: Whisper 系モデルは `delta` イベントで増分ストリーミングを行わない（`completed` と同じ完全テキストが返る）。そのため `completed` イベントを主に使用する。

## サブタスク

### 4-1. マイク入力の取得とリサンプリング

- `getUserMedia({ audio: true })` でマイクアクセスを要求
- `AudioContext` + `AudioWorklet`（または `ScriptProcessorNode`）で PCM データを取得
- `AudioContext` のサンプリングレートを 16000 Hz に設定するか、別途 16000 Hz にダウンサンプリングする
  - `new AudioContext({ sampleRate: 16000 })` で直接 16000 Hz で取得できる場合あり（ブラウザ依存）
  - 対応していない場合は `OfflineAudioContext` でリサンプリング
- PCM データは **16bit 符号付き整数（Int16Array）** に変換してから Base64 エンコードする
- 取得した PCM バイト列を Base64 エンコードして送信

### 4-2. composable の実装 (`app/composables/useRealtimeSpeech.ts`)

以下の機能を持つ composable を実装する。

- `start()`: マイク取得 → WebSocket 接続 → `session.update` 送信 → 音声ストリーミング開始
- `stop()`: 音声ストリーミング停止 → WebSocket 切断
- `isActive`: 音声認識中フラグ（`ref<boolean>`）
- `isSpeaking`: VAD が発話を検出中フラグ（`ref<boolean>`）
- `transcript`: 確定テキストの累積（`ref<string>`）—`completed` イベントで追記

WebSocket イベントハンドリング:
```
onopen        → session.update を送信
onmessage     → イベントタイプに応じて状態を更新
  session.created                                   → isActive = true
  input_audio_buffer.speech_started                 → isSpeaking = true
  input_audio_buffer.speech_stopped                 → isSpeaking = false
  conversation.item.input_audio_transcription.completed → transcript に追記、チャット API 呼び出し
  error                                             → エラーログ
onerror       → エラーハンドリング（ユーザーへの通知）
onclose       → isActive = false、リソース解放
```

### 4-3. 音声認識テキスト表示エリアの実装 (`app/components/voice/TranscriptArea.vue`)

- `transcript` の最新テキストをリアルタイム表示
- `isSpeaking` 中はパルスアニメーション等で視覚的に示す
- 確定テキストが得られたら自動的にチャット API へ送信（`useChatApi.sendMessage()` を呼び出す）
- AI の応答テキストは表情エリアにオーバーレイ表示する（Task 05 で統合）

### 4-4. 音声会話の開始/停止ボタン (`app/components/voice/VoiceButton.vue`)

- ボタン押下で `start()` / `stop()` をトグル
- `isActive` に応じてアクティブ/非アクティブのスタイルを切り替え
- マイクアクセスが拒否された場合のエラー表示

## 動作確認（人手確認）

> 実機での音声入力テストは実装後にユーザーに依頼する。

確認項目:
- [ ] WebSocket 接続後に `session.created` が返る
- [ ] 発話すると `speech_started` → `speech_stopped` → `completed` の順でイベントが届く
- [ ] `completed` イベントの `transcript` に正しい日本語テキストが返る
- [ ] 無音時間が `silence_duration_ms`（500ms）経過すると自動的にコミットされる

## 完了条件

- ボタンを押すとマイクが有効になり、発話が確定テキストとして表示される
- ボタンを再度押すと音声認識が停止する
- 確定テキストがチャット API に自動送信され、AI の応答が返る
- マイクアクセス拒否・WebSocket 切断時のエラーがユーザーに伝わる
