import { uid } from "@/lib/id"
import { runDemoTurn } from "@/lib/demo-runtime"
import { getToolsByIds, toOpenAITools } from "@/lib/tools"
import type {
  Agent,
  ChatTurn,
  OpenAIChatMessage,
  Settings,
  TraceStep,
} from "@/lib/types"

const MAX_ROUNDS = 6

async function executeNamedTool(
  agent: Agent,
  name: string,
  args: Record<string, unknown>,
): Promise<{ result: string; error?: string; durationMs: number }> {
  const tool = getToolsByIds(agent.toolIds).find((t) => t.name === name)
  const started = Date.now()
  if (!tool) {
    return { result: "", error: `未知或未启用工具：${name}`, durationMs: 0 }
  }
  try {
    const result = await tool.execute(args, { agentId: agent.id })
    return { result, durationMs: Date.now() - started }
  } catch (error) {
    return {
      result: "",
      error: error instanceof Error ? error.message : "工具失败",
      durationMs: Date.now() - started,
    }
  }
}

function turnsToOpenAIMessages(agent: Agent, turns: ChatTurn[], userText: string) {
  const messages: OpenAIChatMessage[] = [
    { role: "system", content: agent.systemPrompt },
  ]
  for (const turn of turns.filter((t) => t.status === "done")) {
    messages.push({ role: "user", content: turn.userText })
    messages.push({ role: "assistant", content: turn.assistantText })
  }
  messages.push({ role: "user", content: userText })
  return messages
}

export async function runAgentTurn(options: {
  agent: Agent
  history: ChatTurn[]
  userText: string
  settings: Settings
  onStep: (step: TraceStep) => void
}): Promise<Pick<ChatTurn, "assistantText" | "steps" | "status" | "error">> {
  const { agent, history, userText, settings, onStep } = options
  const useOpenAI = settings.mode === "openai" && Boolean(settings.apiKey.trim())

  if (!useOpenAI) {
    const demo = await runDemoTurn(agent, userText, onStep)
    return { ...demo, status: "done" }
  }

  const tools = getToolsByIds(agent.toolIds)
  const messages = turnsToOpenAIMessages(agent, history, userText)
  const steps: TraceStep[] = []
  const model = agent.model === "demo-agent" ? settings.defaultModel : agent.model

  try {
    for (let round = 0; round < MAX_ROUNDS; round += 1) {
      const llmStep: TraceStep = {
        id: uid(),
        type: "llm",
        label: `模型调用 · 第 ${round + 1} 轮`,
        detail: `${model} @ ${settings.baseUrl}`,
      }
      steps.push(llmStep)
      onStep(llmStep)

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baseUrl: settings.baseUrl,
          apiKey: settings.apiKey,
          model,
          temperature: agent.temperature,
          messages,
          tools: tools.length ? toOpenAITools(tools) : undefined,
        }),
      })

      const payload = (await response.json()) as {
        error?: string
        message?: {
          content?: string | null
          tool_calls?: Array<{
            id: string
            function: { name: string; arguments: string }
          }>
        }
      }

      if (!response.ok) {
        throw new Error(payload.error || `模型请求失败（${response.status}）`)
      }

      const message = payload.message
      if (!message) throw new Error("模型没有返回 message")

      const toolCalls = message.tool_calls ?? []
      if (toolCalls.length === 0) {
        return {
          assistantText: message.content?.trim() || "（模型没有返回文本）",
          steps,
          status: "done",
        }
      }

      messages.push({
        role: "assistant",
        content: message.content ?? null,
        tool_calls: toolCalls.map((call) => ({
          id: call.id,
          type: "function",
          function: call.function,
        })),
      })

      for (const call of toolCalls) {
        let args: Record<string, unknown> = {}
        try {
          args = JSON.parse(call.function.arguments || "{}") as Record<string, unknown>
        } catch {
          args = { raw: call.function.arguments }
        }
        const executed = await executeNamedTool(agent, call.function.name, args)
        const step: TraceStep = {
          id: uid(),
          type: "tool",
          name: call.function.name,
          args,
          result: executed.result,
          durationMs: executed.durationMs,
          error: executed.error,
        }
        steps.push(step)
        onStep(step)
        messages.push({
          role: "tool",
          tool_call_id: call.id,
          name: call.function.name,
          content: executed.error || executed.result,
        })
      }
    }

    return {
      assistantText: "达到最大工具循环次数，已停止。可简化问题后再试。",
      steps,
      status: "error",
      error: "max_rounds",
    }
  } catch (error) {
    const text = error instanceof Error ? error.message : "运行失败"
    const step: TraceStep = { id: uid(), type: "error", text }
    onStep(step)
    return {
      assistantText: "",
      steps: [...steps, step],
      status: "error",
      error: text,
    }
  }
}
