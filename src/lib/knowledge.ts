type Article = {
  title: string
  keywords: string[]
  body: string
}

const ARTICLES: Article[] = [
  {
    title: "什么是 AI Agent",
    keywords: ["agent", "智能体", "代理", "什么是"],
    body: "AI Agent（智能体）是能自主规划、调用工具并完成目标的程序。它不只是一次性回答问题，而是围绕目标循环：观察 → 决策 → 行动（调用工具）→ 再观察，直到给出最终结果。开发 Agent 的核心是系统提示词、工具集、记忆与运行时循环。",
  },
  {
    title: "ReAct 模式",
    keywords: ["react", "推理", "行动", "thought", "action"],
    body: "ReAct（Reason + Act）让模型交替输出思考与行动。典型轨迹：Thought（我需要先查时间）→ Action（get_current_time）→ Observation（2026-09-01 21:15）→ Thought（可以回答了）→ Final Answer。智体工坊的追踪面板就是按这个轨迹展示的。",
  },
  {
    title: "工具调用 / Function Calling",
    keywords: ["tool", "工具", "function", "function calling", "调用"],
    body: "工具调用把模型的自然语言意图变成结构化参数。模型不会自己执行代码，而是返回 tool_calls；运行时执行工具后再把结果塞回对话。设计工具时：名称稳定、描述写清何时使用、参数尽量少且类型明确。",
  },
  {
    title: "系统提示词",
    keywords: ["提示词", "prompt", "system", "人设", "指令"],
    body: "系统提示词定义 Agent 的身份、边界与风格。好的提示词包含：角色、目标、可用工具用法、输出格式、禁止事项。避免又长又空；把会变化的知识放到工具或知识库，而不是写死在提示词里。",
  },
  {
    title: "温度 Temperature",
    keywords: ["temperature", "温度", "随机", "创造性"],
    body: "Temperature 控制采样随机性。0–0.3 适合工具型、事实型 Agent；0.6–0.9 适合头脑风暴与文案。工具调用场景建议偏低，减少胡编参数。",
  },
  {
    title: "MCP",
    keywords: ["mcp", "model context protocol", "协议"],
    body: "MCP（Model Context Protocol）是把工具、资源和提示词以标准协议暴露给模型宿主的方式。本地文件系统、浏览器、数据库都可以做成 MCP Server，供 Cursor 等客户端发现并调用。",
  },
  {
    title: "RAG",
    keywords: ["rag", "检索", "知识库", "embedding"],
    body: "RAG（检索增强生成）在回答前先检索相关文档，再把片段塞进上下文。适合私有知识、频繁更新的资料。和 Agent 结合时，检索本身就是一个 search 工具，由模型决定何时查。",
  },
  {
    title: "智体工坊",
    keywords: ["智体工坊", "本产品", "这个应用", "agent studio"],
    body: "智体工坊是本地优先的 Agent 开发工作台：在浏览器里设计人设、开关工具、在操场里对话，并查看每一步工具调用。默认使用演示引擎（无需密钥）；也可以在设置里接入 OpenAI 兼容接口做真实模型调试。数据保存在本机 localStorage。",
  },
  {
    title: "OpenAI 兼容接口",
    keywords: ["openai", "api", "兼容", "base url", "密钥"],
    body: "许多国产与开源网关都提供 OpenAI 兼容的 /v1/chat/completions。在智体工坊设置里填写 Base URL、API Key 和模型名即可。密钥只存在浏览器本地，请求经本应用的 /api/chat 转发，避免浏览器跨域问题。",
  },
]

export function searchKnowledge(query: string): string {
  const q = query.trim().toLowerCase()
  if (!q) return "请提供要检索的关键词。"

  const scored = ARTICLES.map((article) => {
    const hay = `${article.title} ${article.keywords.join(" ")} ${article.body}`.toLowerCase()
    let score = 0
    for (const token of q.split(/[\s,，、]+/).filter(Boolean)) {
      if (hay.includes(token.toLowerCase())) score += 2
      if (article.keywords.some((k) => k.toLowerCase().includes(token.toLowerCase()))) {
        score += 3
      }
    }
    return { article, score }
  })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)

  if (scored.length === 0) {
    return `知识库中没有与「${query}」直接匹配的条目。可尝试：Agent、ReAct、工具调用、系统提示词、MCP、RAG。`
  }

  return scored
    .slice(0, 3)
    .map(({ article }) => `【${article.title}】\n${article.body}`)
    .join("\n\n")
}
