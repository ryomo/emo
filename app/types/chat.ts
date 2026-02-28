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
