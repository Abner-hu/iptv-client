export type RuntimeMode = "demo" | "openai"

export type Agent = {
  id: string
  name: string
  description: string
  systemPrompt: string
  model: string
  temperature: number
  toolIds: string[]
  createdAt: number
  updatedAt: number
}

export type Settings = {
  mode: RuntimeMode
  apiKey: string
  baseUrl: string
  defaultModel: string
}

export type ToolCall = {
  id: string
  name: string
  arguments: Record<string, unknown>
}

export type TraceStep =
  | {
      id: string
      type: "llm"
      label: string
      detail: string
    }
  | {
      id: string
      type: "tool"
      name: string
      args: Record<string, unknown>
      result: string
      durationMs: number
      error?: string
    }
  | {
      id: string
      type: "error"
      text: string
    }

export type ChatTurn = {
  id: string
  userText: string
  assistantText: string
  steps: TraceStep[]
  status: "running" | "done" | "error"
  error?: string
  createdAt: number
}

export type ToolDefinition = {
  id: string
  name: string
  title: string
  description: string
  parameters: {
    type: "object"
    properties: Record<
      string,
      { type: string; description: string; default?: string }
    >
    required: string[]
  }
  execute: (
    args: Record<string, unknown>,
    ctx: ToolContext,
  ) => Promise<string> | string
}

export type ToolContext = {
  agentId: string
}

export type OpenAIChatMessage = {
  role: "system" | "user" | "assistant" | "tool"
  content: string | null
  tool_calls?: Array<{
    id: string
    type: "function"
    function: { name: string; arguments: string }
  }>
  tool_call_id?: string
  name?: string
}
