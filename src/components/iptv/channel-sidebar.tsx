"use client"

import { Star } from "lucide-react"

import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import type { Channel } from "@/lib/iptv-types"

export function ChannelSidebar({
  groups,
  activeId,
  favorites,
  onSelect,
  onToggleFavorite,
}: {
  groups: { group: string; items: Channel[] }[]
  activeId?: string
  favorites: string[]
  onSelect: (channel: Channel) => void
  onToggleFavorite: (id: string) => void
}) {
  if (groups.length === 0) {
    return (
      <div className="flex h-full items-center justify-center px-6 text-center text-sm text-muted-foreground">
        还没有频道。请先导入 M3U 播放列表。
      </div>
    )
  }

  return (
    <ScrollArea className="h-full">
      <div className="flex flex-col gap-4 p-2 pr-3">
        {groups.map(({ group, items }) => (
          <section key={group}>
            <h3 className="px-2 pb-1 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
              {group}
              <span className="ml-1 text-muted-foreground/70">{items.length}</span>
            </h3>
            <ul className="flex flex-col gap-0.5">
              {items.map((channel) => {
                const active = channel.id === activeId
                const fav = favorites.includes(channel.id)
                return (
                  <li key={channel.id}>
                    <div
                      className={cn(
                        "group flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm",
                        active
                          ? "bg-primary/20 text-primary"
                          : "hover:bg-muted/70",
                      )}
                    >
                      <button
                        type="button"
                        className="flex min-w-0 flex-1 items-center gap-2"
                        onClick={() => onSelect(channel)}
                      >
                        {channel.logo ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={channel.logo}
                            alt=""
                            className="size-7 rounded bg-black object-contain"
                          />
                        ) : (
                          <span className="flex size-7 items-center justify-center rounded bg-muted text-[10px]">
                            {channel.name.slice(0, 2)}
                          </span>
                        )}
                        <span className="truncate">{channel.name}</span>
                      </button>
                      <button
                        type="button"
                        className={cn(
                          "shrink-0 rounded p-1 opacity-0 group-hover:opacity-100",
                          fav && "opacity-100 text-amber-400",
                        )}
                        aria-label="收藏"
                        onClick={() => onToggleFavorite(channel.id)}
                      >
                        <Star className={cn("size-3.5", fav && "fill-current")} />
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>
          </section>
        ))}
      </div>
    </ScrollArea>
  )
}
