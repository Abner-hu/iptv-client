import type { Channel, IptvState, PlaylistRecord } from "@/lib/iptv-types"

const KEY = "iptv-terminal:v1"
const RECENT_LIMIT = 40
const EMPTY: IptvState = {
  playlists: [],
  channels: [],
  favorites: [],
  recentChannelIds: [],
}

let cache: IptvState = EMPTY
let cacheRaw: string | null = null
const listeners = new Set<() => void>()

function emit() {
  for (const listener of listeners) listener()
}

function readRaw(): string | null {
  if (typeof window === "undefined") return null
  try {
    return localStorage.getItem(KEY)
  } catch {
    return null
  }
}

export function getIptvSnapshot(): IptvState {
  const raw = readRaw()
  if (raw === cacheRaw) return cache
  cacheRaw = raw
  if (!raw) {
    cache = EMPTY
    return cache
  }
  try {
    const parsed = JSON.parse(raw) as Partial<IptvState>
    const recentChannelIds = parsed.recentChannelIds ?? []
    cache = {
      playlists: parsed.playlists ?? [],
      channels: parsed.channels ?? [],
      favorites: parsed.favorites ?? [],
      recentChannelIds:
        recentChannelIds.length > 0
          ? recentChannelIds
          : parsed.lastChannelId
            ? [parsed.lastChannelId]
            : [],
      lastChannelId: parsed.lastChannelId,
      lastSourceId: parsed.lastSourceId,
    }
    return cache
  } catch {
    cache = EMPTY
    return cache
  }
}

export function getIptvServerSnapshot(): IptvState {
  return EMPTY
}

export function subscribeIptv(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function saveIptvState(next: IptvState) {
  cache = next
  const raw = JSON.stringify(next)
  cacheRaw = raw
  localStorage.setItem(KEY, raw)
  emit()
}

export function upsertPlaylist(
  playlist: PlaylistRecord,
  channels: Channel[],
  extras?: Partial<Pick<IptvState, "lastChannelId" | "lastSourceId">>,
) {
  const current = getIptvSnapshot()
  const playlists = [
    playlist,
    ...current.playlists.filter((item) => item.id !== playlist.id),
  ]
  const merged = [
    ...channels,
    ...current.channels.filter((channel) => channel.sourceId !== playlist.id),
  ]
  saveIptvState({
    ...current,
    playlists,
    channels: merged,
    lastSourceId: extras?.lastSourceId ?? playlist.id,
    lastChannelId: extras?.lastChannelId ?? current.lastChannelId,
  })
}

export function removePlaylist(id: string) {
  const current = getIptvSnapshot()
  const channels = current.channels.filter((channel) => channel.sourceId !== id)
  const keep = new Set(channels.map((channel) => channel.id))
  saveIptvState({
    ...current,
    playlists: current.playlists.filter((item) => item.id !== id),
    channels,
    recentChannelIds: current.recentChannelIds.filter((channelId) => keep.has(channelId)),
    lastSourceId: current.lastSourceId === id ? undefined : current.lastSourceId,
  })
}

export function toggleFavorite(channelId: string) {
  const current = getIptvSnapshot()
  const favorites = current.favorites.includes(channelId)
    ? current.favorites.filter((id) => id !== channelId)
    : [channelId, ...current.favorites]
  saveIptvState({ ...current, favorites })
}

export function setLastChannel(channelId: string) {
  const current = getIptvSnapshot()
  const recentChannelIds = [
    channelId,
    ...current.recentChannelIds.filter((id) => id !== channelId),
  ].slice(0, RECENT_LIMIT)
  saveIptvState({ ...current, lastChannelId: channelId, recentChannelIds })
}

export function clearAll() {
  saveIptvState(EMPTY)
}
