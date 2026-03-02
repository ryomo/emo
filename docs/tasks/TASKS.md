# Implementation Task List

Implementation tasks for a Nuxt 4 AI chat + voice-conversation frontend that uses Lemonade Server as the backend.

## Task Summary

| # | Task | Description | Status |
|---|------|-------------|--------|
| [01](./01-project-setup.md) | Project setup | Set up directory structure, dependencies, and environment variables | Done |
| [02](./02-chat-api.md) | Chat API integration | Conversation via `/api/v1/chat/completions` | Done |
| [03](./03-tts-api.md) | Text-to-speech (TTS) | Read AI responses via `/api/v1/audio/speech` | Done |
| [04](./04-realtime-speech.md) | Real-time speech recognition | Transcribe user speech via `/realtime` WebSocket | Done |
| [05](./05-ui-layout.md) | UI layout | Build the main UI (chat, emotion area, voice button, etc.) | Done |
| [06](./06-ai-emotion.md) | AI emotion display | Dynamically switch emotions using emojis instructed by the system prompt | Done |

## Dependencies

```
01 (Setup)
 ├─ 02 (Chat API)
 │   └─ 06 (AI emotion display)  ← Extension of 02 (detect emotion from response emojis)
 ├─ 03 (TTS)
 ├─ 04 (Real-time speech recognition)
 └─ 05 (UI layout)              ← Integrates the UI for 02–04 and 06
```

## Prerequisites

- Lemonade Server is running locally (default: `http://localhost:8000`)
- Example model: `Gemma-3-4b-it-GGUF`
