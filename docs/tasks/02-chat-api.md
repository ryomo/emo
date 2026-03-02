# Task 02: Chat API Integration

## Overview

Implement chat with an LLM using Lemonade Server's `/api/v1/chat/completions` endpoint.
This task is a prerequisite for Task 06 (AI emotion display).

## API Spec

- **Endpoint**: `POST /api/v1/chat/completions`
- **Request example**:
  ```json
  {
    "model": "Gemma-3-4b-it-GGUF",
    "messages": [
      { "role": "system", "content": "You are a helpful assistant." },
      { "role": "user", "content": "Hello" }
    ]
  }
  ```
- **Response**: OpenAI Chat Completions API-compatible format

## Subtasks

### 2-1. Types (`app/types/chat.ts`)

```ts
type ChatRole = 'system' | 'user' | 'assistant' | 'tool'

interface ChatMessage {
  role: ChatRole
  content: string
  tool_calls?: ToolCall[]  // Tool calls from the assistant
  tool_call_id?: string    // Used when role is 'tool'
}

interface ToolCall {
  id: string
  type: 'function'
  function: {
    name: string
    arguments: string  // JSON string
  }
}
```

### 2-2. Composable (`app/composables/useChatApi.ts`)

Implement a composable with the following.

- `messages`: conversation history (`ref<ChatMessage[]>`)
- `isLoading`: request-in-flight flag
- `sendMessage(userText: string)`: append a user message and call the API
- `clearHistory()`: reset the conversation
- In the system prompt, instruct the model to keep responses short

### 2-3. System prompt

For voice-first interactions, configure the system prompt with the following guidelines.

- Keep responses to around 1–3 sentences
- Include tool definitions for tool calling (added in Task 06)

### 2-4. Wire into chat UI components

- `ChatHistory.vue`: render the message list (distinguish user vs assistant)
- `ChatInput.vue`: text send form; calls `sendMessage`

## Done Criteria

- When you send text, the AI response appears in the chat UI
- Conversation history accumulates correctly and preserves context
- Disable input while loading
