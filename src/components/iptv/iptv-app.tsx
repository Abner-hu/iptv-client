"use client"

import { useMemo, useState, useSyncExternalStore } from "react"
import { FolderPlus, Radio, Search, Trash2 } from "lucide-react"

import { ChannelSidebar } from "@/components/iptv/channel-sidebar"
import { ImportDialog } from "@/components/iptv/import-dialog"
import { PlayerStage } from "@/components/iptv/player-stage"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { downloadPlaylist } from "@/lib/iptv-fetch"
import { DEFAULT_IMPORT_IDS, KNOWN_PLAYLISTS } from "@/lib/known-playlists"
import { groupChannels, parseM3u } from "@/lib/m3u"
import {
  getIptvServerSnapshot,
  getIptvSnapshot,
  removePlaylist,
  setLastChannel,
  subscribeIptv,
  toggleFavorite,
  upsertPlaylist,
} from "@/lib/iptv-store"
import type { Channel } from "@/lib/iptv-types"

export function IptvApp() {
  const state = useSyncExternalStore(
    subscribeIptv,
    getIptvSnapshot,
    getIptvServerSnapshot,
  )
  const [importOpen, setImportOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [sourceFilter, setSourceFilter] = useState("all")
  const [bootstrapping, setBootstrapping] = useState(false)
  const [bootError, setBootError] = useState<string | null>(null)

  const channels = useMemo(() => {
    return state.channels.filter((channel) => {
      if (sourceFilter !== "all" && channel.sourceId !== sourceFilter) return false
      if (!query.trim()) return true
      const q = query.trim().toLowerCase()
      return (
        channel.name.toLowerCase().includes(q) ||
        channel.group.toLowerCase().includes(q)
      )
    })
  }, [state.channels, query, sourceFilter])

  const favoriteChannels = channels.filter((channel) =>
    state.favorites.includes(channel.id),
  )
  const groups = useMemo(() => {
    const grouped = groupChannels(channels)
    if (favoriteChannels.length === 0) return grouped
    return [{ group: "收藏", items: favoriteChannels }, ...grouped]
  }, [channels, favoriteChannels])

  const active =
    channels.find((channel) => channel.id === state.lastChannelId) ??
    channels[0] ??
    null

  async function bootstrap() {
    if (bootstrapping) return
    setBootstrapping(true)
    setBootError(null)
    try {
      let total = 0
      for (const id of DEFAULT_IMPORT_IDS) {
        const known = KNOWN_PLAYLISTS.find((item) => item.id === id)
        if (!known) continue
        const text = await downloadPlaylist(known.url)
        const parsed = parseM3u(text, known.id)
        total += parsed.length
        upsertPlaylist(
          {
            id: known.id,
            name: known.name,
            url: known.url,
            kind: "remote",
            channelCount: parsed.length,
            importedAt: parsed.length,
          },
          parsed,
        )
      }
      if (total === 0) throw new Error("公开源没有返回频道")
    } catch (error) {
      setBootError(error instanceof Error ? error.message : "自动导入失败")
    } finally {
      setBootstrapping(false)
    }
  }

  function play(channel: Channel) {
    setLastChannel(channel.id)
  }

  const empty = state.channels.length === 0

  return (
    <div className="flex h-dvh min-h-0 flex-col bg-background">
      <header className="flex items-center gap-3 border-b border-white/10 px-4 py-2.5">
        <span className="flex size-8 items-center justify-center rounded-md bg-red-600 text-white shadow-[0_0_20px_color-mix(in_oklch,red_40%,transparent)]">
          <Radio className="size-4" />
        </span>
        <div className="leading-tight">
          <h1 className="text-sm font-semibold tracking-wide">IPTV 终端</h1>
          <p className="text-[11px] text-muted-foreground">公开 M3U 直播播放器</p>
        </div>
        <Badge variant="secondary" className="hidden sm:inline-flex">
          {state.channels.length} 频道
        </Badge>
        <div className="relative ml-auto hidden min-w-40 flex-1 sm:block sm:max-w-xs">
          <Search className="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索频道 / 分组"
            className="h-8 pl-7"
          />
        </div>
        <Select value={sourceFilter} onValueChange={setSourceFilter}>
          <SelectTrigger className="w-32" size="sm">
            <SelectValue placeholder="全部源" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部源</SelectItem>
            {state.playlists.map((playlist) => (
              <SelectItem key={playlist.id} value={playlist.id}>
                {playlist.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {sourceFilter !== "all" && (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="移除当前源"
            onClick={() => removePlaylist(sourceFilter)}
          >
            <Trash2 />
          </Button>
        )}
        <Button size="sm" asChild>
          <a href="/iptv-tv.apk" download="IPTV终端-电视版.apk">
            电视 APK
          </a>
        </Button>
        <Button size="sm" onClick={() => setImportOpen(true)}>
          <FolderPlus data-icon="inline-start" />
          导入 M3U
        </Button>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-[320px] shrink-0 flex-col border-r border-white/10 md:flex">
          <div className="border-b border-white/10 p-2 sm:hidden" />
          <ChannelSidebar
            groups={groups}
            activeId={active?.id}
            favorites={state.favorites}
            onSelect={play}
            onToggleFavorite={toggleFavorite}
          />
        </aside>

        <main className="flex min-w-0 flex-1 flex-col gap-3 p-3">
          {empty ? (
            <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 px-6 text-center">
              <Radio className="size-10 text-red-500" />
              <h2 className="mt-4 text-xl font-semibold">尚未载入播放列表</h2>
              <p className="mt-2 max-w-md text-sm text-muted-foreground">
                一键导入 iptv-org 的公开中国内地与香港 M3U，或自行粘贴列表地址、打开本地文件。
              </p>
              {bootError && (
                <p className="mt-2 text-sm text-destructive">{bootError}</p>
              )}
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                <Button onClick={() => void bootstrap()} disabled={bootstrapping}>
                  {bootstrapping ? "正在导入公开源…" : "导入已知源（中国 + 香港）"}
                </Button>
                <Button variant="outline" onClick={() => setImportOpen(true)}>
                  选择更多列表
                </Button>
                <Button variant="outline" asChild>
                  <a href="/iptv-tv.apk" download="IPTV终端-电视版.apk">
                    下载电视安装包 (APK)
                  </a>
                </Button>
              </div>
              <p className="mt-4 max-w-md text-xs text-muted-foreground">
                安卓电视 / 小米 / 海信 / TCL / 创维：用 U 盘或「当贝市场 / 应用安装器」安装 APK。遥控器上下选台，确认键播放。
              </p>
            </div>
          ) : (
            <>
              <PlayerStage channel={active} />
              <div className="h-56 overflow-hidden rounded-xl border border-white/10 md:hidden">
                <ChannelSidebar
                  groups={groups}
                  activeId={active?.id}
                  favorites={state.favorites}
                  onSelect={play}
                  onToggleFavorite={toggleFavorite}
                />
              </div>
            </>
          )}
        </main>
      </div>
      <ImportDialog open={importOpen} onOpenChange={setImportOpen} />
    </div>
  )
}
