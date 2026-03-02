# Task 06: AI Emotion Display

## Overview

Instruct the AI (via the system prompt) to include an emotion emoji in each response. Detect the emoji in the response text and dynamically switch the on-screen emotion.

> **Implementation note**
> We initially considered setting emotions via tool calling. However, tool calling was not stable with Lemonade Server + `Gemma-3-4b-it-GGUF`,
> so we chose the system-prompt + emoji-detection approach.

## Emotion Definitions

| Emotion ID | Emoji | Description |
|--------|-----------|------|
| `happy` | 😊 | Happy / joyful |
| `sad` | 😢 | Sad |
| `angry` | 😠 | Angry |
| `surprised` | 😲 | Surprised |
| `thinking` | 🤔 | Thinking |
| `neutral` | 😐 | Neutral |

## Subtasks

### 6-1. Types (`app/types/emotion.ts`)

```ts
type EmotionType = 'happy' | 'sad' | 'angry' | 'surprised' | 'thinking' | 'neutral'

const EMOTION_EMOJI: Record<EmotionType, string> = {
  happy: '😊', sad: '😢', angry: '😠',
  surprised: '😲', thinking: '🤔', neutral: '😐',
}

// Emoji → emotion reverse map
const EMOJI_TO_EMOTION: Record<string, EmotionType>

// Utility: remove emotion emojis from text
function stripEmotionEmoji(text: string): string
```

### 6-2. Emoji instruction in the system prompt

In the system prompt in `useChatApi.ts`, instruct the model to prefix every response with one emoji from `EMOTION_EMOJI`.

### 6-3. Composable (`app/composables/useAiEmotion.ts`)

- `emotionState`: current and previous emotions (`ref<EmotionState>`)
- `currentEmoji`: current emoji (`computed`)
- `detectEmotionFromText(text: string)`: detect emojis from `EMOTION_EMOJI` in text and set the emotion to the **last** emoji found

### 6-4. Strip emojis in chat history

- When rendering assistant messages in `ChatHistory.vue`, remove emotion emojis via `stripEmotionEmoji()`
- Emotion emojis should be displayed only in `EmotionDisplay.vue`

### 6-5. Wire into the emotion area

- `EmotionDisplay.vue` receives `emotionState.current` and renders it
- Fade animation via Vue `<Transition>` when the emotion changes
- In `index.vue`, watch `messages.length` and call `detectEmotionFromText()` on new assistant messages

## Done Criteria

- The emotion emoji switches automatically based on AI responses ✅
- Emotion emojis do not appear in chat history ✅
- Emotion changes are animated ✅
