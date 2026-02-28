/** チャットメッセージのロール */
export type ChatRole = 'system' | 'user' | 'assistant' | 'tool'

/** Tool Call の関数情報 */
export interface ToolFunction {
  name: string
  arguments: string // JSON 文字列
}

/** Tool Call */
export interface ToolCall {
  id: string
  type: 'function'
  function: ToolFunction
}

/** チャットメッセージ */
export interface ChatMessage {
  role: ChatRole
  content: string | null
  tool_calls?: ToolCall[]
  tool_call_id?: string
}

/** Chat Completions API レスポンスの choice */
export interface ChatChoice {
  index: number
  message: ChatMessage
  finish_reason: string | null
}

/** Chat Completions API レスポンスの usage */
export interface ChatUsage {
  prompt_tokens: number
  completion_tokens: number
  total_tokens: number
}

/** Chat Completions API レスポンス (OpenAI 互換) */
export interface ChatCompletionResponse {
  id: string
  object: string
  created: number
  model: string
  choices: ChatChoice[]
  usage?: ChatUsage
}
