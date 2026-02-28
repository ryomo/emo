# Task 04: リアルタイム音声認識 (WebSocket)

## 概要

Lemonade Server の `/realtime` WebSocket エンドポイントを使い、ユーザーのマイク入力をリアルタイムでテキスト化する。
OpenAI Realtime API 互換。モデルは **Whisper-Large-v3-Turbo** を使用。

## API 仕様

参考: [Lemonade Server Spec - WS /realtime](https://lemonade-server.ai/docs/server/server_spec/#ws-realtime)

- **エンドポイント**: `ws://localhost:<websocket_port>/realtime?model=<model_name>`
  - WebSocket ポートは `/api/v1/health` の `websocket_port` フィールドから取得可能（OS 動的割り当て）
  - モデル名はクエリパラメータで指定
- **プロトコル**: OpenAI Realtime API 互換（WebSocket、JSON イベントを送受信）
- **音声フォーマット**: PCM 16kHz モノラル 16bit（`pcm16`）
  - ブラウザのマイク入力（通常 44100 / 48000 Hz）は **ネイティブレートで取得し、送信時に 16kHz へ線形補間ダウンサンプリング**
  - Float32 → Int16 変換後、**Base64 エンコード**して送信
  - チャンクサイズ: AudioWorklet で 2048 サンプル（ネイティブレート）をバッファしてから送信（約 43ms @ 48kHz）
  - > ⚠️ **Lemonade Server の制約**: **16kHz mono PCM16 のみ**対応。`AudioContext({ sampleRate: 16000 })` はブラウザによって無視されるため、明示的なダウンサンプリングが必要。

### セッション設定（接続直後に送信）

```json
{
  "type": "session.update",
  "session": {
    "model": "Whisper-Large-v3-Turbo",
    "turn_detection": {
      "threshold": 0.01,
      "prefix_padding_ms": 250,
      "silence_duration_ms": 800
    }
  }
}
```

> **Note**: `input_audio_format`、`input_audio_transcription`、`turn_detection.type` は Lemonade Server では未サポートの OpenAI 固有フィールド。送信不要。
> VAD の `threshold` はデフォルト `0.01`（RMS エネルギー閾値）。高すぎると発話を検出できないため注意。

### 音声データ送信（ストリーミング）

```json
{
  "type": "input_audio_buffer.append",
  "audio": "<Base64エンコードされたPCM16バイト列>"
}
```

### 受信するサーバーイベント

| イベント | 説明 |
|---------|------|
| `session.created` | 接続確立、セッション初期化完了 |
| `session.updated` | セッション設定の更新完了 |
| `input_audio_buffer.speech_started` | VAD が発話開始を検出 |
| `input_audio_buffer.speech_stopped` | VAD が発話終了を検出、自動コミット |
| `input_audio_buffer.committed` | 音声バッファがコミットされた |
| `conversation.item.created` | 会話アイテムが作成された |
| `conversation.item.input_audio_transcription.delta` | 認識テキストの増分（Whisper では `completed` と同内容） |
| `conversation.item.input_audio_transcription.completed` | 1 ターン分の確定テキスト（`transcript` フィールド） |
| `error` | エラー |

> **Note**: Whisper 系モデルは `delta` イベントで増分ストリーミングを行わない（`completed` と同じ完全テキストが返る）。そのため `completed` イベントのみ使用する。

## サブタスク

### 4-1. マイク入力の取得とダウンサンプリング

- `getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true } })` でマイクアクセスを要求
  - `sampleRate` や `autoGainControl` は指定しない（ブラウザのネイティブレートをそのまま使用）
- `AudioContext`（sampleRate 指定なし） + `AudioWorklet`（`pcm-processor`）で PCM Float32 データを取得
- AudioWorklet 内で 2048 サンプルをバッファリングし、まとめてメインスレッドへ転送
- メインスレッドで **ネイティブレート → 16kHz への線形補間ダウンサンプリング**を実施
- ダウンサンプリング後、Int16 に変換して Base64 エンコードし WebSocket で送信
- オーディオパイプライン: `Mic → MediaStreamSource → GainNode(増幅) → AudioWorkletNode → SilentGainNode → destination`
  - GainNode で `MIC_GAIN`（現在 `1`）倍に増幅
  - SilentGainNode（gain=0）でスピーカー出力を抑制しつつパイプラインをアクティブに保つ

### 4-2. composable の実装 (`app/composables/useRealtimeSpeech.ts`)

以下の機能を持つ composable を実装する。

- `start()`: マイク取得 → WebSocket 接続 → `session.update` 送信 → 音声ストリーミング開始
- `stop()`: 音声ストリーミング停止 → WebSocket 切断 → リソース解放
- `isListening`: 音声認識中フラグ（`Readonly<Ref<boolean>>`）
- `isSpeaking`: VAD が発話を検出中フラグ（`Readonly<Ref<boolean>>`）
- `transcript`: 最新の確定テキスト（`Readonly<Ref<string>>`）— `completed` イベントで**上書き**（累積しない）
- `error`: エラーメッセージ（`Readonly<Ref<string | null>>`）
- コンストラクタオプション: `onTranscriptComplete(text)` コールバックで確定テキストを外部に通知

WebSocket イベントハンドリング:
```
onopen        → session.update を送信
onmessage     → イベントタイプに応じて状態を更新
  session.created                                   → sessionReady = true, isListening = true
  session.updated                                   → ログ出力
  input_audio_buffer.speech_started                 → isSpeaking = true
  input_audio_buffer.speech_stopped                 → isSpeaking = false
  conversation.item.input_audio_transcription.completed → transcript を上書き、onTranscriptComplete コールバック呼び出し
  error                                             → error に設定
onerror       → エラーハンドリング（ユーザーへの通知）
onclose       → sessionReady = false, isListening = false, isSpeaking = false
```

コンポーネントアンマウント時に自動クリーンアップ（`onUnmounted`）。

### 4-3. 音声認識テキスト表示エリアの実装 (`app/components/voice/TranscriptArea.vue`)

- `transcript` の**最新テキストのみ**を表示（累積しない）
- `isSpeaking` 中はパルスアニメーション + 緑色インジケーターで視覚的に示す
- `isActive` に応じてプレースホルダーテキストを切り替え
- `error` があれば赤色テキストで表示
- 確定テキストが得られたら自動的にチャット API へ送信（`index.vue` で `onTranscriptComplete` → `useChatApi.sendMessage()` を呼び出す）

### 4-4. 音声会話の開始/停止ボタン (`app/components/voice/VoiceButton.vue`)

- ボタン押下で `start()` / `stop()` をトグル（`index.vue` の `toggleVoice()` 経由）
- `isListening` に応じてアクティブ（赤・パルス・⏹）/非アクティブ（緑・🎤）のスタイルを切り替え
- `disabled` 中はグレーアウト（チャット API ローディング中など）

### 4-5. AudioWorklet プロセッサ (`public/audio-worklet-processor.js`)

- `PCMProcessor` クラス（`AudioWorkletProcessor` 継承）
- 128 フレームごとに `process()` が呼ばれ、Float32 データをバッファリング
- 2048 サンプル蓄積したらメインスレッドへ `transferable` で転送
- メインスレッドからの `stop` メッセージで処理を停止

## 動作確認（人手確認）

> 実機での音声入力テストは実装後にユーザーに依頼する。

確認項目:
- [x] WebSocket 接続後に `session.created` が返る
- [x] `session.update` 送信後に `session.updated` が返る
- [x] 発話すると `speech_started` → `speech_stopped` → `committed` → `completed` の順でイベントが届く
- [x] `completed` イベントの `transcript` に正しい日本語テキストが返る
- [x] 無音時間が `silence_duration_ms`（800ms）経過すると自動的にコミットされる
- [x] 確定テキストがチャット API に自動送信され、AI の応答が返る

## 完了条件

- ボタンを押すとマイクが有効になり、発話が確定テキストとして表示される
- ボタンを再度押すと音声認識が停止する
- 確定テキストがチャット API に自動送信され、AI の応答が返る
- マイクアクセス拒否・WebSocket 切断時のエラーがユーザーに伝わる
