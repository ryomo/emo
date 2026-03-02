# Task 05: UI Layout

## Overview

Build the main page by combining the chat area, speech transcription area, AI emotion area, and the voice button. This task integrates the components from Tasks 02–06.

## Layout

```
┌─────────────────────────────────────────┐
│  Chat history (ChatHistory)              │
│  ┌─────────────────────────────────┐    │
│  │ [assistant] Hello!               │    │
│  │              [user] Thanks       │    │
│  └─────────────────────────────────┘    │
│                                         │
│  ┌──────────────────────────────────┐   │
│  │  AI emotion area (EmotionDisplay) │   │
│  │  ┌──────────────────────────┐    │   │
│  │  │     😊  (emoji)           │    │   │
│  │  └──────────────────────────┘    │   │
│  │  ┌──────────────────────────┐    │   │
│  │  │ AI response text (overlay)│    │   │
│  │  └──────────────────────────┘    │   │
│  └──────────────────────────────────┘   │
│                                         │
│  Speech transcript (TranscriptArea)      │
│  [  Interim text appears here...      ]  │
│                                         │
│  ┌──────────┐  ┌───────────────────┐   │
│  │ 🎤 Voice │  │  Text input form   │   │
│  └──────────┘  └───────────────────┘   │
└─────────────────────────────────────────┘
```

## Subtasks

### 5-1. Create the page (`app/pages/index.vue`)

- Main page implementing the above layout
- Use composables (`useChatApi`, `useTtsApi`, `useRealtimeSpeech`, `useAiEmotion`) here and connect them to components via props / emits

### 5-2. Chat history (`app/components/chat/ChatHistory.vue`)

- Accept `messages` and render user/assistant bubbles
- Auto-scroll to the newest message
- Show a skeleton or typing indicator while loading

### 5-3. Chat input form (`app/components/chat/ChatInput.vue`)

- Text input + send button
- Send on Enter as well
- Disable while `isLoading`

### 5-4. AI emotion area (`app/components/emotion/EmotionDisplay.vue`)

- Display a large emoji for the current emotion
- Overlay the AI response text (e.g. semi-transparent background)
- Add a transition animation when the emotion changes

### 5-5. Transcript area (`app/components/voice/TranscriptArea.vue`)

- Display interim text in real time
- Indicate active recognition with a pulse animation, etc.

### 5-6. Voice button (`app/components/voice/VoiceButton.vue`)

- Switch active/inactive styles based on `isActive`
- Use icons (mic on/off)

### 5-7. Responsive design

- Keep the layout stable across desktop/tablet/mobile
- Ensure the emotion area remains readable on mobile

## Done Criteria

- All components are placed on a single page
- Both text chat and voice conversation work on the same screen
- The AI response text is shown as an overlay in the emotion area
