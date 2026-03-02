# Task 01: Project Setup

## Overview

Set up the foundation of the Nuxt 4 project: add dependencies, organize the directory structure, and configure environment variables.

## Subtasks

### 1-1. Add dependencies

Consider adding one of the following styling libraries.

| Library | Purpose | Notes |
|-----------|------|------|
| `@nuxtjs/tailwindcss` or `unocss` | Styling | Choose one |

> Add other libraries as needed per task. Prefer Nuxt 4 built-ins (e.g. `useFetch`, `useWebSocket`) whenever possible.

### 1-2. Organize the directory structure

Use the following structure as a guideline under `app/`.

```
app/
  app.vue
  pages/
    index.vue          # Main chat + voice conversation page
  components/
    chat/
      ChatHistory.vue   # Chat message list
      ChatInput.vue    # Text input form
    voice/
      VoiceButton.vue  # Start/stop voice conversation button
      TranscriptArea.vue # Speech transcription display area
    emotion/
      EmotionDisplay.vue # AI emotion display area
  composables/
    useChatApi.ts        # Chat API integration (Task 02)
    useTtsApi.ts         # TTS API integration (Task 03)
    useRealtimeSpeech.ts # WebSocket speech recognition (Task 04)
    useAiEmotion.ts      # AI emotion state management (Task 06)
  types/
    chat.ts              # Message types, tool call types, etc.
    emotion.ts           # Emotion type definitions
```

### 1-3. Configure environment variables

Create a `.env` file and define the following variables.

```env
NUXT_PUBLIC_LEMONADE_BASE_URL=http://localhost:8000
NUXT_PUBLIC_LEMONADE_MODEL=Gemma-3-4b-it-GGUF
```

In `nuxt.config.ts`, add the variables under `runtimeConfig.public`.

```ts
runtimeConfig: {
  public: {
    lemonadeBaseUrl: '',  // Overridden by NUXT_PUBLIC_LEMONADE_BASE_URL in .env
    lemonadeModel: '',
  }
}
```

### 1-4. Create TypeScript type definitions

Define shared types under `app/types/`.

- `ChatMessage` / `ChatRole` / `ToolCall` / `ToolFunction`, etc. (detailed in Task 02)
- `EmotionType` (detailed in Task 06)

## Done Criteria

- `npm run dev` starts without errors
- The app renders at `http://localhost:3000`
- Environment variables are accessible via `useRuntimeConfig()`
