"use client"

import { useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { downloadPlaylist } from "@/lib/iptv-fetch"
import { KNOWN_PLAYLISTS } from "@/lib/known-playlists"
import { parseM3u } from "@/lib/m3u"
import { upsertPlaylist } from "@/lib/iptv-store"

export function ImportDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [selected, setSelected] = useState<string[]>(["cn", "hk"])
  const [customUrl, setCustomUrl] = useState("")
  const [customName, setCustomName] = useState("")
  const [busy, setBusy] = useState(false)

  async function importRemote(id: string, name: string, url: string) {
    const text = await downloadPlaylist(url)
    const channels = parseM3u(text, id)
    if (channels.length === 0) throw new Error(`${name} 没有解析到频道`)
    upsertPlaylist(
      {
        id,
        name,
        url,
        kind: "remote",
        channelCount: channels.length,
        importedAt: channels.length,
      },
      channels,
    )
    return channels.length
  }

  async function importSelected() {
    const targets = KNOWN_PLAYLISTS.filter((item) => selected.includes(item.id))
    if (targets.length === 0) {
      toast.error("请至少勾选一个已知源")
      return
    }
    setBusy(true)
    let total = 0
    try {
      for (const item of targets) {
        total += await importRemote(item.id, item.name, item.url)
      }
      toast.success(`已导入 ${targets.length} 个列表，共 ${total} 个频道`)
      onOpenChange(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "导入失败")
    } finally {
      setBusy(false)
    }
  }

  async function importCustom() {
    const url = customUrl.trim()
    if (!url) {
      toast.error("请填写 M3U 地址")
      return
    }
    setBusy(true)
    try {
      const name = customName.trim() || new URL(url).hostname
      const count = await importRemote(`custom-${hashName(url)}`, name, url)
      toast.success(`已导入 ${count} 个频道`)
      onOpenChange(false)
      setCustomUrl("")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "导入失败")
    } finally {
      setBusy(false)
    }
  }

  async function importFile(file: File) {
    setBusy(true)
    try {
      const text = await file.text()
      const id = `file-${hashName(file.name)}`
      const channels = parseM3u(text, id)
      if (channels.length === 0) throw new Error("文件里没有有效频道")
      upsertPlaylist(
        {
          id,
          name: file.name,
          kind: "file",
          channelCount: channels.length,
          importedAt: channels.length,
        },
        channels,
      )
      toast.success(`从文件导入 ${channels.length} 个频道`)
      onOpenChange(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "无法读取文件")
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>导入 M3U8</DialogTitle>
          <DialogDescription>
            内置源来自 iptv-org 公开播放列表，也可粘贴自定义地址或打开本地 .m3u 文件。
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div>
            <Label>已知公开源</Label>
            <ScrollArea className="mt-2 h-52 rounded-lg border">
              <ul className="p-2">
                {KNOWN_PLAYLISTS.map((item) => {
                  const checked = selected.includes(item.id)
                  return (
                    <li key={item.id}>
                      <label
                        className={
                          checked
                            ? "flex cursor-pointer items-start gap-2 rounded-md bg-amber-500 px-2 py-2 text-zinc-950"
                            : "flex cursor-pointer items-start gap-2 rounded-md px-2 py-2 hover:bg-muted/60"
                        }
                      >
                        <input
                          type="checkbox"
                          className="mt-1 size-4 accent-zinc-950"
                          checked={checked}
                          onChange={() => {
                            setSelected((prev) =>
                              checked
                                ? prev.filter((id) => id !== item.id)
                                : [...prev, item.id],
                            )
                          }}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2">
                            <span className="block text-sm font-medium">
                              {item.name}
                              <span
                                className={
                                  checked
                                    ? "ml-2 text-xs font-normal text-zinc-800"
                                    : "ml-2 text-xs font-normal text-muted-foreground"
                                }
                              >
                                {item.region}
                              </span>
                            </span>
                            {checked ? (
                              <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-zinc-950">
                                已选
                              </span>
                            ) : null}
                          </span>
                          <span
                            className={
                              checked
                                ? "block text-xs text-zinc-800"
                                : "block text-xs text-muted-foreground"
                            }
                          >
                            {item.description}
                          </span>
                        </span>
                      </label>
                    </li>
                  )
                })}
              </ul>
            </ScrollArea>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="m3u-url">自定义 M3U 地址</Label>
            <Input
              id="m3u-url"
              placeholder="https://example.com/live.m3u"
              value={customUrl}
              onChange={(e) => setCustomUrl(e.target.value)}
            />
            <Input
              placeholder="列表名称（可选）"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="m3u-file">本地文件</Label>
            <Input
              id="m3u-file"
              type="file"
              accept=".m3u,.m3u8,.txt"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) void importFile(file)
              }}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => void importCustom()} disabled={busy}>
            导入地址
          </Button>
          <Button onClick={() => void importSelected()} disabled={busy}>
            {busy ? "正在导入…" : "导入已选公开源"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function hashName(input: string) {
  let value = 0
  for (let i = 0; i < input.length; i += 1) {
    value = (value * 31 + input.charCodeAt(i)) | 0
  }
  return Math.abs(value).toString(36)
}
