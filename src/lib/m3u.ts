import type { Channel } from "@/lib/iptv-types"

function hash(input: string): string {
  let value = 0
  for (let i = 0; i < input.length; i += 1) {
    value = (value * 31 + input.charCodeAt(i)) | 0
  }
  return Math.abs(value).toString(36)
}

function attr(source: string, key: string): string | undefined {
  const quoted = source.match(new RegExp(`${key}="([^"]*)"`, "i"))
  if (quoted?.[1]) return quoted[1]
  const bare = source.match(new RegExp(`${key}=([^,\\s]+)`, "i"))
  return bare?.[1]
}

export function parseM3u(text: string, sourceId: string): Channel[] {
  const lines = text.split(/\r?\n/)
  const channels: Channel[] = []
  let pending: Omit<Channel, "id" | "url"> | null = null

  for (const raw of lines) {
    const line = raw.trim()
    if (!line || line === "#EXTM3U") continue

    if (line.startsWith("#EXTINF:")) {
      const comma = line.lastIndexOf(",")
      const meta = comma >= 0 ? line.slice(0, comma) : line
      const name = (comma >= 0 ? line.slice(comma + 1) : "未命名频道").trim() || "未命名频道"
      pending = {
        name,
        group: attr(meta, "group-title")?.trim() || "未分组",
        logo: attr(meta, "tvg-logo"),
        tvgId: attr(meta, "tvg-id"),
        sourceId,
      }
      continue
    }

    if (line.startsWith("#")) continue

    if (pending && /^https?:\/\//i.test(line)) {
      channels.push({
        ...pending,
        id: hash(`${sourceId}|${pending.name}|${line}`),
        url: line,
      })
      pending = null
    }
  }

  return channels
}

export function groupChannels(channels: Channel[]): { group: string; items: Channel[] }[] {
  const map = new Map<string, Channel[]>()
  for (const channel of channels) {
    const list = map.get(channel.group) ?? []
    list.push(channel)
    map.set(channel.group, list)
  }
  return [...map.entries()]
    .sort((a, b) => a[0].localeCompare(b[0], "zh-CN"))
    .map(([group, items]) => ({ group, items }))
}
