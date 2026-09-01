export function proxiedStream(url: string): string {
  return `/api/proxy?url=${encodeURIComponent(url)}`
}

export async function downloadPlaylist(url: string): Promise<string> {
  const response = await fetch(`/api/playlist?url=${encodeURIComponent(url)}`)
  const payload = (await response.json()) as { text?: string; error?: string }
  if (!response.ok || !payload.text) {
    throw new Error(payload.error || "下载播放列表失败")
  }
  return payload.text
}
