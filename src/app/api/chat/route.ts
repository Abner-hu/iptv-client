import { NextResponse } from "next/server"

export const runtime = "nodejs"

type ChatBody = {
  baseUrl?: string
  apiKey?: string
  model?: string
  temperature?: number
  messages?: unknown[]
  tools?: unknown[]
}

export async function POST(request: Request) {
  let body: ChatBody
  try {
    body = (await request.json()) as ChatBody
  } catch {
    return NextResponse.json({ error: "请求体不是合法 JSON" }, { status: 400 })
  }

  const apiKey = body.apiKey?.trim()
  const baseUrl = (body.baseUrl || "https://api.openai.com/v1").replace(/\/$/, "")
  const model = body.model?.trim()

  if (!apiKey) {
    return NextResponse.json({ error: "缺少 API Key" }, { status: 401 })
  }
  if (!model) {
    return NextResponse.json({ error: "缺少模型名" }, { status: 400 })
  }
  if (!Array.isArray(body.messages)) {
    return NextResponse.json({ error: "缺少 messages" }, { status: 400 })
  }

  try {
    const upstream = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: body.temperature ?? 0.3,
        messages: body.messages,
        tools: body.tools,
      }),
    })

    const data = (await upstream.json()) as {
      error?: { message?: string }
      choices?: Array<{ message?: unknown }>
    }

    if (!upstream.ok) {
      return NextResponse.json(
        { error: data.error?.message || `上游错误 ${upstream.status}` },
        { status: upstream.status },
      )
    }

    return NextResponse.json({ message: data.choices?.[0]?.message ?? null })
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "无法连接模型服务",
      },
      { status: 502 },
    )
  }
}
