import { NextResponse } from "next/server"

export const runtime = "nodejs"

const UA = "VLC/3.0.20 LibVLC/3.0.20"

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === "http:" || url.protocol === "https:"
  } catch {
    return false
  }
}

export async function GET(request: Request) {
  const target = new URL(request.url).searchParams.get("url")?.trim()
  if (!target || !isHttpUrl(target)) {
    return NextResponse.json({ error: "请提供合法的 http(s) 播放列表地址" }, { status: 400 })
  }

  try {
    const upstream = await fetch(target, {
      headers: { "User-Agent": UA, Accept: "*/*" },
      redirect: "follow",
      cache: "no-store",
    })
    const text = await upstream.text()
    if (!upstream.ok) {
      return NextResponse.json(
        { error: `源站返回 ${upstream.status}`, detail: text.slice(0, 200) },
        { status: 502 },
      )
    }
    return NextResponse.json({
      text,
      contentType: upstream.headers.get("content-type") || "application/x-mpegURL",
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "无法下载播放列表" },
      { status: 502 },
    )
  }
}
