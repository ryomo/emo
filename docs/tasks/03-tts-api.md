# Task 03: Text-to-Speech (TTS) API Integration

## Overview

Use Lemonade Server's `/api/v1/audio/speech` endpoint to convert the AI's response text into audio and play it back.

## API Spec

- **Endpoint**: `POST /api/v1/audio/speech`
- **Request example**:
  ```json
  {
    "model": "…",
    "input": "Hello — how are you?",
    "voice": "…"
  }
  ```
- **Response**: audio binary data (e.g. `audio/mpeg`)

> Confirm the detailed request schema using the [Lemonade Server Docs](https://lemonade-server.ai/docs/server/server_spec/#endpoints-overview).

## Subtasks

### 3-1. Composable (`app/composables/useTtsApi.ts`)

Implement a composable with the following.

- `speak(text: string)`: convert text to audio and play it
- `isSpeaking`: playback-in-progress flag
- `stop()`: stop the currently playing audio
- Use either the Web Audio API or an `<audio>` element

Implementation flow:
1. Send a request via `fetch`
2. Receive the response as a `Blob`
3. Create a playback URL via `URL.createObjectURL(blob)`
4. Play with an `Audio` object, and revoke the URL after playback ends

### 3-2. Integrate with the chat API

- After Task 02's `sendMessage` receives a response successfully, call `speak()` automatically
- Pass the AI response text (`choices[0].message.content`)

### 3-3. UI feedback during playback

- Show some visual feedback while audio is playing (e.g. an animated icon)

## Done Criteria

- When an AI response arrives, audio plays automatically
- You can stop mid-playback via `stop()`
- If `speak()` is called repeatedly, stop the previous audio before starting the next
