/** Chat message role */
export type ChatRole = 'system' | 'user' | 'assistant' | 'tool'

/** Tool call function info */
export interface ToolFunction {
  name: string
  arguments: string // JSON string
}

/** Tool call */
export interface ToolCall {
  id: string
  type: 'function'
  function: ToolFunction
}

/** Chat message */
export interface ChatMessage {
  role: ChatRole
  content: string | null
  tool_calls?: ToolCall[]
  tool_call_id?: string
}

/** Chat Completions API response choice */
export interface ChatChoice {
  index: number
  message: ChatMessage
  finish_reason: string | null
}

/** Chat Completions API response usage */
export interface ChatUsage {
  prompt_tokens: number
  completion_tokens: number
  total_tokens: number
}

/** Chat Completions API response (OpenAI compatible) */
export interface ChatCompletionResponse {
  id: string
  object: string
  created: number
  model: string
  choices: ChatChoice[]
  usage?: ChatUsage
}
