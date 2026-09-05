"use client"

import { useMemo, useState, useSyncExternalStore } from "react"
import { FolderPlus, History, Info, Radio, Search, Settings, Trash2 } from "lucide-react"
import { toast } from "sonner"

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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { APK_FILENAME, APP_VERSION, EXE_DOWNLOAD_URL, EXE_FILENAME } from "@/lib/apk"
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
  clearAll,
} from "@/lib/iptv-store"
import type { Channel } from "@/lib/iptv-types"

export function IptvApp() {
  const state = useSyncExternalStore(
    subscribeIptv,
    getIptvSnapshot,
    getIptvServerSnapshot,
  )
  const [importOpen, setImportOpen] = useState(false)
  const [copyrightOpen, setCopyrightOpen] = useState(false)
  const [clearOpen, setClearOpen] = useState(false)
  const [viewMode, setViewMode] = useState<"all" | "recent">("all")
  const [query, setQuery] = useState("")
  const [sourceFilter, setSourceFilter] = useState("all")
  const [bootstrapping, setBootstrapping] = useState(false)
  const [bootError, setBootError] = useState<string | null>(null)

  const recentChannels = useMemo(() => {
    const byId = new Map(state.channels.map((channel) => [channel.id, channel]))
    return state.recentChannelIds
      .map((id) => byId.get(id))
      .filter((channel): channel is Channel => Boolean(channel))
  }, [state.channels, state.recentChannelIds])

  const channels = useMemo(() => {
    const source = viewMode === "recent" ? recentChannels : state.channels
    return source.filter((channel) => {
      if (viewMode === "all" && sourceFilter !== "all" && channel.sourceId !== sourceFilter) {
        return false
      }
      if (!query.trim()) return true
      const q = query.trim().toLowerCase()
      return (
        channel.name.toLowerCase().includes(q) ||
        channel.group.toLowerCase().includes(q)
      )
    })
  }, [state.channels, recentChannels, query, sourceFilter, viewMode])

  const favoriteChannels = channels.filter((channel) =>
    state.favorites.includes(channel.id),
  )
  const groups = useMemo(() => {
    if (viewMode === "recent") {
      return channels.length === 0 ? [] : [{ group: "最近播放", items: channels }]
    }
    const grouped = groupChannels(channels)
    if (favoriteChannels.length === 0) return grouped
    return [{ group: "收藏", items: favoriteChannels }, ...grouped]
  }, [channels, favoriteChannels, viewMode])

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

  function showRecent() {
    if (recentChannels.length === 0) {
      toast.error("还没有最近播放的频道，先播放一个。")
      return
    }
    setSourceFilter("all")
    setViewMode("recent")
  }

  function clearPlaylists() {
    clearAll()
    setViewMode("all")
    setSourceFilter("all")
    setClearOpen(false)
    toast.success("已清除全部 M3U")
  }

  const empty = state.channels.length === 0

  return (
    <div className="flex h-dvh min-h-0 flex-col bg-background">
      <header className="flex items-center gap-3 border-b border-white/10 px-4 py-2.5">
        <span className="flex size-8 items-center justify-center rounded-md bg-red-600 shadow-[0_0_20px_color-mix(in_oklch,red_40%,transparent)]">
          <svg viewBox="0 0 32 32" className="size-5" aria-hidden>
            <rect x="5.01" y="2.88" width="4.96" height="26.24" fill="white" />
            <path
              d="M12.7 5.36h3.47L24.51 13.7 16.17 22.04H12.7"
              fill="none"
              stroke="white"
              strokeWidth="4.96"
              strokeLinejoin="round"
              strokeLinecap="butt"
            />
          </svg>
          <span className="sr-only">IPTV Client</span>
        </span>
        <div className="leading-tight">
          <h1 className="text-sm font-semibold tracking-wide">IPTV Client</h1>
          <p className="text-[11px] text-muted-foreground">公开 M3U 直播播放器</p>
        </div>
        <Badge variant="secondary" className="hidden sm:inline-flex">
          {viewMode === "recent"
            ? `最近播放 · ${recentChannels.length}`
            : `${state.channels.length} 频道`}
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
        <Select
          value={sourceFilter}
          onValueChange={(value) => {
            setViewMode("all")
            setSourceFilter(value)
          }}
        >
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
          <a href={`/${APK_FILENAME}`} download={APK_FILENAME}>
            下载 APK
          </a>
        </Button>
        <Button size="sm" variant="outline" asChild>
          <a href={EXE_DOWNLOAD_URL} download={EXE_FILENAME}>
            下载 EXE
          </a>
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm">
              <Settings data-icon="inline-start" />
              设置
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-44">
            <DropdownMenuItem onSelect={() => showRecent()}>
              <History />
              最近播放
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setImportOpen(true)}>
              <FolderPlus />
              导入 M3U
            </DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onSelect={() => setClearOpen(true)}>
              <Trash2 />
              清除 M3U
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button variant="outline" size="sm" onClick={() => setCopyrightOpen(true)}>
          <Info data-icon="inline-start" />
          关于
        </Button>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-[320px] shrink-0 flex-col border-r border-white/10 md:flex">
          {viewMode === "recent" && (
            <div className="flex items-center justify-between gap-2 border-b border-white/10 px-3 py-2">
              <span className="text-sm font-medium">最近播放</span>
              <Button size="xs" variant="ghost" onClick={() => setViewMode("all")}>
                显示全部
              </Button>
            </div>
          )}
          <ChannelSidebar
            groups={groups}
            activeId={active?.id}
            favorites={state.favorites}
            onSelect={play}
            onToggleFavorite={toggleFavorite}
            emptyLabel={
              viewMode === "recent" ? "没有匹配的最近播放频道。" : undefined
            }
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
                  <a href={`/${APK_FILENAME}`} download={APK_FILENAME}>
                    下载 APK（电视 / 手机）
                  </a>
                </Button>
                <Button variant="outline" asChild>
                  <a href={EXE_DOWNLOAD_URL} download={EXE_FILENAME}>
                    下载 EXE（Windows）
                  </a>
                </Button>
              </div>
              <p className="mt-4 max-w-md text-xs text-muted-foreground">
                同一 APK 可装安卓电视和安卓手机。电视用 U 盘或当贝市场；手机打开文件并允许未知来源即可。Windows 用绿色版 EXE，双击打开。
              </p>
            </div>
          ) : (
            <>
              <PlayerStage channel={active} playlist={channels} onSelect={play} />
              <div className="h-72 overflow-hidden rounded-xl border border-white/10 md:hidden">
                {viewMode === "recent" && (
                  <div className="flex items-center justify-between gap-2 border-b border-white/10 px-3 py-2">
                    <span className="text-sm font-medium">最近播放</span>
                    <Button size="xs" variant="ghost" onClick={() => setViewMode("all")}>
                      显示全部
                    </Button>
                  </div>
                )}
                <ChannelSidebar
                  groups={groups}
                  activeId={active?.id}
                  favorites={state.favorites}
                  onSelect={play}
                  onToggleFavorite={toggleFavorite}
                  emptyLabel={
                    viewMode === "recent" ? "没有匹配的最近播放频道。" : undefined
                  }
                />
              </div>
            </>
          )}
        </main>
      </div>
      <ImportDialog open={importOpen} onOpenChange={setImportOpen} />
      <Dialog open={clearOpen} onOpenChange={setClearOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>清除 M3U</DialogTitle>
            <DialogDescription>
              将删除全部已导入的播放列表和频道，此操作无法恢复。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setClearOpen(false)}>
              取消
            </Button>
            <Button variant="destructive" onClick={clearPlaylists}>
              清除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={copyrightOpen} onOpenChange={setCopyrightOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>关于</DialogTitle>
            <DialogDescription>IPTV Client 软件说明</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 text-sm leading-6">
            <p>软件名称：IPTV Client</p>
            <p>版本：{APP_VERSION}</p>
            <p>版权所有人：Abner Hu</p>
            <p>Copyright © 2026 Abner Hu. All rights reserved.</p>
            <p className="text-muted-foreground">
              内置频道列表来自 iptv-org 等公开源，版权归各播出机构所有。本软件仅提供播放器与列表导入功能。
            </p>
          </div>
          <DialogFooter>
            <Button onClick={() => setCopyrightOpen(false)}>关闭</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
