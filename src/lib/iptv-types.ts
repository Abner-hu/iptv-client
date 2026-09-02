export type Channel = {
  id: string
  name: string
  url: string
  group: string
  logo?: string
  tvgId?: string
  sourceId: string
}

export type PlaylistRecord = {
  id: string
  name: string
  url?: string
  kind: "remote" | "file"
  channelCount: number
  importedAt: number
}

export type IptvState = {
  playlists: PlaylistRecord[]
  channels: Channel[]
  favorites: string[]
  recentChannelIds: string[]
  lastChannelId?: string
  lastSourceId?: string
}
