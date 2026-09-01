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
    return new Response("missing url", { status: 400 })
  }

  try {
    const upstream = await fetch(target, {
      headers: {
        "User-Agent": UA,
        Accept: "*/*",
        Referer: new URL(target).origin + "/",
      },
      redirect: "follow",
      cache: "no-store",
    })

    const headers = new Headers()
    const contentType = upstream.headers.get("content-type")
    if (contentType) headers.set("content-type", contentType)
    headers.set(
      "cache-control",
      contentType?.startsWith("image/") ? "public, max-age=86400" : "no-store",
    )
    headers.set("access-control-allow-origin", "*")

    return new Response(upstream.body, {
      status: upstream.status,
      headers,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "proxy failed"
    return new Response(message, { status: 502 })
  }
}
