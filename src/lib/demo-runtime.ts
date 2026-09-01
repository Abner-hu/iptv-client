import { uid } from "@/lib/id"
import { getToolsByIds } from "@/lib/tools"
import type { Agent, ChatTurn, ToolCall, TraceStep } from "@/lib/types"

const CITY_TZ: Array<[RegExp, string, string]> = [
  [/北京|上海|深圳|广州|杭州|成都|中国/, "北京", "Asia/Shanghai"],
  [/纽约/, "纽约", "America/New_York"],
  [/洛杉矶/, "洛杉矶", "America/Los_Angeles"],
  [/伦敦/, "伦敦", "Europe/London"],
  [/东京|日本/, "东京", "Asia/Tokyo"],
  [/巴黎/, "巴黎", "Europe/Paris"],
  [/新加坡/, "新加坡", "Asia/Singapore"],
  [/悉尼/, "悉尼", "Australia/Sydney"],
]

function enabled(agent: Agent, id: string) {
  return agent.toolIds.includes(id)
}

function extractMathExpressions(text: string): string[] {
  const normalized = text
    .replace(/加/g, "+")
    .replace(/减/g, "-")
    .replace(/乘以|乘/g, "*")
    .replace(/除以|除/g, "/")
    .replace(/×/g, "*")
    .replace(/÷/g, "/")

  const chunks = normalized.match(/[0-9+\-*/().\s]{3,}/g) ?? []
  const cleaned = chunks
    .map((chunk) => chunk.replace(/\s+/g, ""))
    .filter((chunk) => /\d/.test(chunk) && /[+\-*/]/.test(chunk))
  return [...new Set(cleaned)]
}

function wantsTime(text: string) {
  return /几点|时间|时区|今天|现在|日期|星期/.test(text)
}

function wantsKnowledge(text: string) {
  return /什么是|怎么|如何|介绍|解释|为何|为什么|mcp|rag|react|提示词|agent|智能体|工具调用|function/i.test(
    text,
  )
}

function extractNote(text: string): string | null {
  const m = text.match(/(?:记住|记下|保存笔记|请记住)[:：]?\s*(.+)$/)
  return m?.[1]?.trim() || null
}

function wantsNotes(text: string) {
  return /笔记|我说过|记住了什么|你还记得/.test(text)
}

async function runTool(
  agent: Agent,
  name: string,
  args: Record<string, unknown>,
): Promise<TraceStep> {
  const tools = getToolsByIds(agent.toolIds)
  const tool = tools.find((t) => t.name === name || t.id === name)
  const started = Date.now()
  if (!tool) {
    return {
      id: uid(),
      type: "tool",
      name,
      args,
      result: "",
      durationMs: 0,
      error: `未启用工具 ${name}`,
    }
  }
  try {
    const result = await tool.execute(args, { agentId: agent.id })
    return {
      id: uid(),
      type: "tool",
      name: tool.name,
      args,
      result,
      durationMs: Date.now() - started,
    }
  } catch (error) {
    return {
      id: uid(),
      type: "tool",
      name: tool.name,
      args,
      result: "",
      durationMs: Date.now() - started,
      error: error instanceof Error ? error.message : "工具执行失败",
    }
  }
}

function planCalls(agent: Agent, text: string): ToolCall[] {
  const calls: ToolCall[] = []

  if (enabled(agent, "calculator")) {
    for (const expression of extractMathExpressions(text)) {
      calls.push({ id: uid(), name: "calculator", arguments: { expression } })
    }
  }

  if (enabled(agent, "get_current_time") && wantsTime(text)) {
    const hits = CITY_TZ.filter(([re]) => re.test(text))
    if (hits.length === 0) {
      calls.push({ id: uid(), name: "get_current_time", arguments: {} })
    } else {
      for (const [, label] of hits) {
        calls.push({
          id: uid(),
          name: "get_current_time",
          arguments: { timezone: label },
        })
      }
    }
  }

  const note = extractNote(text)
  if (enabled(agent, "save_note") && note) {
    calls.push({ id: uid(), name: "save_note", arguments: { note } })
  } else if (enabled(agent, "list_notes") && wantsNotes(text)) {
    calls.push({ id: uid(), name: "list_notes", arguments: {} })
  }

  if (enabled(agent, "knowledge_lookup") && wantsKnowledge(text)) {
    const query = text.replace(/^(请|帮我|你)/, "").slice(0, 80)
    calls.push({ id: uid(), name: "knowledge_lookup", arguments: { query } })
  }

  return calls
}

function composeReply(agent: Agent, userText: string, steps: TraceStep[]): string {
  const toolSteps = steps.filter((s): s is Extract<TraceStep, { type: "tool" }> => s.type === "tool")
  const lines: string[] = []

  if (toolSteps.length === 0) {
    const intro = agent.description || "我可以按系统提示词与已启用的工具来完成任务。"
    return `我是${agent.name}。${intro}\n你刚才说：「${userText}」。如果需要我查概念、做计算、看时间或记笔记，直接说具体问题即可。`
  }

  const calc = toolSteps.filter((s) => s.name === "calculator")
  const times = toolSteps.filter((s) => s.name === "get_current_time")
  const knowledge = toolSteps.filter((s) => s.name === "knowledge_lookup")
  const notes = toolSteps.filter((s) => s.name === "save_note" || s.name === "list_notes")

  if (calc.length) {
    lines.push(calc.map((s) => s.error ? `计算失败：${s.error}` : s.result).join("\n"))
  }
  if (times.length) {
    lines.push(times.map((s) => s.error ? `时间查询失败：${s.error}` : s.result).join("\n"))
  }
  if (knowledge.length) {
    lines.push(knowledge.map((s) => s.result).join("\n\n"))
  }
  if (notes.length) {
    lines.push(notes.map((s) => s.result).join("\n"))
  }

  const terse = /克制|短句|简洁/.test(agent.systemPrompt)
  if (terse) return lines.join("\n")
  return `${lines.join("\n\n")}\n\n（演示引擎根据系统提示词与工具结果合成，未调用外部模型。）`
}

export async function runDemoTurn(
  agent: Agent,
  userText: string,
  onStep: (step: TraceStep) => void,
): Promise<Pick<ChatTurn, "assistantText" | "steps">> {
  const think: TraceStep = {
    id: uid(),
    type: "llm",
    label: "演示引擎规划",
    detail: "根据用户话术匹配工具：计算器、时间、知识库、笔记。",
  }
  onStep(think)

  const calls = planCalls(agent, userText)
  const steps: TraceStep[] = [think]

  for (const call of calls) {
    const step = await runTool(agent, call.name, call.arguments)
    steps.push(step)
    onStep(step)
  }

  const assistantText = composeReply(agent, userText, steps)
  return { assistantText, steps }
}
