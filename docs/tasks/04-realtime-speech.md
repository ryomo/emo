# Task 04: Real-time Speech Recognition (WebSocket)

## Overview

Use Lemonade Server's `/realtime` WebSocket endpoint to transcribe the user's microphone input in real time.
This is compatible with the OpenAI Realtime API. Use **Whisper-Large-v3-Turbo**.

## API Spec

Reference: [Lemonade Server Spec - WS /realtime](https://lemonade-server.ai/docs/server/server_spec/#ws-realtime)

- **Endpoint**: `ws://localhost:<websocket_port>/realtime?model=<model_name>`
  - The WebSocket port can be retrieved from the `websocket_port` field of `/api/v1/health` (dynamically assigned by the OS)
  - Specify the model name via a query parameter
- **Protocol**: OpenAI Realtime API-compatible (WebSocket, JSON events)
- **Audio format**: PCM 16kHz mono 16-bit (`pcm16`)
  - Browser microphone input (typically 44.1kHz / 48kHz) should be captured at the native rate, then **linearly downsampled to 16kHz before sending**
  - Convert Float32 → Int16, then **Base64-encode** before sending
  - Chunk size: buffer 2048 samples (native rate) in an AudioWorklet before sending (≈43ms @ 48kHz)
  - > ⚠️ **Lemonade Server constraint**: only **16kHz mono PCM16** is supported. `AudioContext({ sampleRate: 16000 })` may be ignored depending on the browser, so explicit downsampling is required.

### Session configuration (send immediately after connect)

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

> **Note**: `input_audio_format`, `input_audio_transcription`, and `turn_detection.type` are OpenAI-specific fields that are not supported by Lemonade Server. Do not send them.
> The default VAD `threshold` is `0.01` (RMS energy threshold). If it is too high, speech may not be detected.

### Send audio data (streaming)

```json
{
  "type": "input_audio_buffer.append",
  "audio": "<Base64-encoded PCM16 bytes>"
}
```

### Server events to handle

| Event | Description |
|-------|-------------|
| `session.created` | Connection established; session initialized |
| `session.updated` | Session update applied |
| `input_audio_buffer.speech_started` | VAD detected speech start |
| `input_audio_buffer.speech_stopped` | VAD detected speech end; auto-commit |
| `input_audio_buffer.committed` | Audio buffer was committed |
| `conversation.item.created` | Conversation item created |
| `conversation.item.input_audio_transcription.delta` | Incremental transcript (for Whisper, identical to `completed`) |
| `conversation.item.input_audio_transcription.completed` | Final transcript for one turn (`transcript` field) |
| `error` | Error |

> **Note**: Whisper-family models do not stream incremental updates via `delta` (they return the same full text as `completed`). Therefore, use only the `completed` event.

## Subtasks

### 4-1. Capture mic input and downsample

- Request mic access via `getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true } })`
  - Do not set `sampleRate` or `autoGainControl` (use the browser's native rate)
- Capture PCM Float32 via `AudioContext` (no sampleRate override) + `AudioWorklet` (`pcm-processor`)
- Buffer 2048 samples inside the AudioWorklet and transfer them to the main thread in batches
- On the main thread, perform **linear downsampling from native rate → 16kHz**
- After downsampling, convert to Int16, Base64-encode, and send over WebSocket
- Audio pipeline: `Mic → MediaStreamSource → GainNode (amplify) → AudioWorkletNode → SilentGainNode → destination`
  - Use GainNode to apply `MIC_GAIN` (currently `1`)
  - Use SilentGainNode (gain=0) to keep the pipeline active while suppressing speaker output

### 4-2. Composable (`app/composables/useRealtimeSpeech.ts`)

Implement a composable with the following.

- `start()`: get mic → connect WebSocket → send `session.update` → start streaming audio
- `stop()`: stop streaming → disconnect WebSocket → release resources
- `isListening`: listening flag (`Readonly<Ref<boolean>>`)
- `isSpeaking`: VAD-detected speaking flag (`Readonly<Ref<boolean>>`)
- `transcript`: latest finalized text (`Readonly<Ref<string>>`) — **overwrite** on `completed` (do not accumulate)
- `error`: error message (`Readonly<Ref<string | null>>`)
- Constructor option: `onTranscriptComplete(text)` callback to notify external code of finalized transcripts

WebSocket event handling:
```
onopen        → send session.update
onmessage     → update state based on event type
  session.created                                   → sessionReady = true, isListening = true
  session.updated                                   → log
  input_audio_buffer.speech_started                 → isSpeaking = true
  input_audio_buffer.speech_stopped                 → isSpeaking = false
  conversation.item.input_audio_transcription.completed → overwrite transcript; call onTranscriptComplete
  error                                             → set error
onerror       → error handling (notify user)
onclose       → sessionReady = false, isListening = false, isSpeaking = false
```

Auto-clean up on component unmount (`onUnmounted`).

### 4-3. Transcript display UI (`app/components/voice/TranscriptArea.vue`)

- Display **only the latest** `transcript` (do not accumulate)
- While `isSpeaking`, show a pulse animation + a green indicator
- Switch placeholder text based on `isActive`
- If `error` exists, show it in red
- When a finalized transcript is received, automatically send it to the chat API (in `index.vue`: `onTranscriptComplete` → call `useChatApi.sendMessage()`)

### 4-4. Voice start/stop button (`app/components/voice/VoiceButton.vue`)

- Toggle `start()` / `stop()` on button press (via `toggleVoice()` in `index.vue`)
- Switch styles based on `isListening`: active (red, pulse, ⏹) vs inactive (green, 🎤)
- Gray out when `disabled` (e.g. while the chat API is loading)

### 4-5. AudioWorklet processor (`public/audio-worklet-processor.js`)

- `PCMProcessor` class (extends `AudioWorkletProcessor`)
- `process()` runs every 128 frames; buffer Float32 samples
- When 2048 samples are accumulated, transfer to the main thread as a `transferable`
- Stop processing when receiving a `stop` message from the main thread

## Manual verification

> Ask the user to test microphone input on a real device after implementation.

Checklist:
- [x] After connecting, `session.created` is received
- [x] After sending `session.update`, `session.updated` is received
- [x] Speaking produces events in order: `speech_started` → `speech_stopped` → `committed` → `completed`
- [x] The `transcript` field in the `completed` event contains the expected text
- [x] When silence lasts for `silence_duration_ms` (800ms), audio is auto-committed
- [x] The finalized transcript is automatically sent to the chat API and an AI response is returned

## Done Criteria

- Pressing the button enables the mic and finalized transcripts appear
- Pressing again stops recognition
- Finalized transcripts are automatically sent to the chat API and AI responses are returned
- Errors (mic permission denied / WebSocket disconnect) are surfaced to the user
