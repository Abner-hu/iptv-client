import { uid } from "@/lib/id"
import type { Agent } from "@/lib/types"

export function createSeedAgents(): Agent[] {
  const now = Date.now()
  return [
    {
      id: uid(),
      name: "研究助理",
      description: "检索 Agent 开发知识，并把要点记进笔记。适合作为第一条调试路径。",
      systemPrompt: `你是「研究助理」，服务正在开发 AI Agent 的工程师。
规则：
- 先用 knowledge_lookup 查内置知识库，再组织答案。
- 用户说「记住」时调用 save_note；问「我说过什么」时调用 list_notes。
- 回答用简洁中文，先给结论，再补 2–4 条要点。
- 不知道就说不知道，不要编造知识库里没有的内容。`,
      model: "demo-agent",
      temperature: 0.3,
      toolIds: ["knowledge_lookup", "save_note", "list_notes"],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: uid(),
      name: "运算顾问",
      description: "精确计算与时区查询。用来验证多工具串联。",
      systemPrompt: `你是「运算顾问」，只处理数字与时间。
规则：
- 任何算术都必须调用 calculator，不要心算。
- 问几点、时差、某地时间时调用 get_current_time。
- 最终回答给出算式、结果，必要时附带时区。
- 语气克制、短句。`,
      model: "demo-agent",
      temperature: 0.1,
      toolIds: ["calculator", "get_current_time"],
      createdAt: now + 1,
      updatedAt: now + 1,
    },
    {
      id: uid(),
      name: "提示词教练",
      description: "点评系统提示词，并对照知识库给出可执行改写建议。",
      systemPrompt: `你是「提示词教练」，帮助用户写出更好的 Agent 系统提示词。
规则：
- 需要概念定义时先 knowledge_lookup。
- 点评时覆盖：角色是否清晰、工具用法、输出格式、禁止项、长度。
- 每次给出一版可直接粘贴的改写稿。
- 中文，直接、具体，避免空话。`,
      model: "demo-agent",
      temperature: 0.5,
      toolIds: ["knowledge_lookup"],
      createdAt: now + 2,
      updatedAt: now + 2,
    },
  ]
}

export function blankAgent(): Agent {
  const now = Date.now()
  return {
    id: uid(),
    name: "未命名 Agent",
    description: "",
    systemPrompt: `你是一个有用的中文助手。
- 需要数字时使用 calculator。
- 需要时间时使用 get_current_time。
- 需要概念时使用 knowledge_lookup。
- 用户要求记住时使用 save_note。`,
    model: "demo-agent",
    temperature: 0.4,
    toolIds: ["calculator", "get_current_time", "knowledge_lookup"],
    createdAt: now,
    updatedAt: now,
  }
}
