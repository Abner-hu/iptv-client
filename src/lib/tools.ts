import { searchKnowledge } from "@/lib/knowledge"
import { listNotes, saveNote } from "@/lib/notes"
import type { ToolDefinition } from "@/lib/types"

const TIMEZONES: Record<string, string> = {
  北京: "Asia/Shanghai",
  上海: "Asia/Shanghai",
  中国: "Asia/Shanghai",
  深圳: "Asia/Shanghai",
  东京: "Asia/Tokyo",
  日本: "Asia/Tokyo",
  纽约: "America/New_York",
  洛杉矶: "America/Los_Angeles",
  伦敦: "Europe/London",
  巴黎: "Europe/Paris",
  新加坡: "Asia/Singapore",
  悉尼: "Australia/Sydney",
  utc: "UTC",
  gmt: "UTC",
}

function resolveTimeZone(input?: string): string {
  if (!input) return Intl.DateTimeFormat().resolvedOptions().timeZone
  const key = input.trim().toLowerCase()
  for (const [name, tz] of Object.entries(TIMEZONES)) {
    if (key.includes(name.toLowerCase()) || key === tz.toLowerCase()) return tz
  }
  return input
}

function safeCalculate(expression: string): string {
  const normalized = expression
    .replace(/×|＊|x/gi, "*")
    .replace(/÷|／/g, "/")
    .replace(/＋/g, "+")
    .replace(/－/g, "-")
    .replace(/（/g, "(")
    .replace(/）/g, ")")
    .replace(/\s+/g, "")

  if (!normalized) throw new Error("空表达式")
  if (!/^[\d+\-*/().]+$/.test(normalized)) {
    throw new Error("只支持数字与 + - * / ( )")
  }
  if (!/\d/.test(normalized)) throw new Error("缺少数字")

  const fn = new Function(`"use strict"; return (${normalized})`)
  const value = fn()
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error("无法计算该表达式")
  }
  return String(value)
}

export const TOOL_CATALOG: ToolDefinition[] = [
  {
    id: "calculator",
    name: "calculator",
    title: "计算器",
    description: "计算数学表达式，仅支持 + - * / 与括号。在需要精确数字时使用。",
    parameters: {
      type: "object",
      properties: {
        expression: {
          type: "string",
          description: "要计算的表达式，例如 (17.5-3)*8",
        },
      },
      required: ["expression"],
    },
    execute: (args) => {
      const expression = String(args.expression ?? "")
      return `表达式 ${expression} = ${safeCalculate(expression)}`
    },
  },
  {
    id: "get_current_time",
    name: "get_current_time",
    title: "当前时间",
    description: "查询某个时区的当前日期与时间。可传入城市名或 IANA 时区。",
    parameters: {
      type: "object",
      properties: {
        timezone: {
          type: "string",
          description: "时区或城市，如 Asia/Shanghai、北京、纽约",
        },
      },
      required: [],
    },
    execute: (args) => {
      const timezone = resolveTimeZone(
        args.timezone ? String(args.timezone) : undefined,
      )
      const now = new Date()
      const formatted = new Intl.DateTimeFormat("zh-CN", {
        timeZone: timezone,
        dateStyle: "full",
        timeStyle: "medium",
      }).format(now)
      return `${timezone} 当前时间：${formatted}（ISO ${now.toISOString()}）`
    },
  },
  {
    id: "knowledge_lookup",
    name: "knowledge_lookup",
    title: "知识检索",
    description: "在内置 Agent 开发知识库中检索概念，例如 ReAct、工具调用、提示词、MCP。",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "检索关键词或问题" },
      },
      required: ["query"],
    },
    execute: (args) => searchKnowledge(String(args.query ?? "")),
  },
  {
    id: "save_note",
    name: "save_note",
    title: "保存笔记",
    description: "把用户要求记住的信息写入该 Agent 的本地笔记。",
    parameters: {
      type: "object",
      properties: {
        note: { type: "string", description: "要记住的内容" },
      },
      required: ["note"],
    },
    execute: (args, ctx) => {
      const note = String(args.note ?? "").trim()
      if (!note) return "没有可保存的内容。"
      const all = saveNote(ctx.agentId, note)
      return `已记住：${note}。当前共 ${all.length} 条笔记。`
    },
  },
  {
    id: "list_notes",
    name: "list_notes",
    title: "读取笔记",
    description: "列出该 Agent 已经记住的笔记。",
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
    execute: (_args, ctx) => {
      const notes = listNotes(ctx.agentId)
      if (notes.length === 0) return "还没有笔记。"
      return notes.map((n, i) => `${i + 1}. ${n}`).join("\n")
    },
  },
]

export function getToolsByIds(ids: string[]): ToolDefinition[] {
  const set = new Set(ids)
  return TOOL_CATALOG.filter((tool) => set.has(tool.id))
}

export function toOpenAITools(tools: ToolDefinition[]) {
  return tools.map((tool) => ({
    type: "function" as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    },
  }))
}
