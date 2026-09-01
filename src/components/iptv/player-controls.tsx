"use client"

import { ChevronLeft, ChevronRight, Maximize, Minimize, Volume2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { cn } from "@/lib/utils"

export function PlayerControls({
  canSkip,
  volume,
  fullscreen,
  onPrev,
  onNext,
  onVolume,
  onFullscreen,
}: {
  canSkip: boolean
  volume: number
  fullscreen: boolean
  onPrev: () => void
  onNext: () => void
  onVolume: (value: number) => void
  onFullscreen: () => void
}) {
  return (
    <div className="flex shrink-0 items-center gap-2 border-t border-white/10 bg-[#1C1917] px-2 py-1.5">
      <div className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={!canSkip}
          onClick={onPrev}
        >
          <ChevronLeft data-icon="inline-start" />
          上一个频道
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={!canSkip}
          onClick={onNext}
        >
          下一个频道
          <ChevronRight data-icon="inline-end" />
        </Button>
        <div className="flex min-w-28 items-center gap-2 pl-1">
          <Volume2 className="size-4 shrink-0 text-muted-foreground" />
          <span className="shrink-0 text-xs text-muted-foreground">音量控制</span>
          <Slider
            min={0}
            max={100}
            step={1}
            value={[Math.round(volume * 100)]}
            onValueChange={(values) => onVolume((values[0] ?? 0) / 100)}
            aria-label="音量控制"
            className="w-28 sm:w-36"
          />
        </div>
      </div>
      <Button
        type="button"
        size="sm"
        className={cn("ml-auto shrink-0")}
        onClick={onFullscreen}
      >
        {fullscreen ? <Minimize data-icon="inline-start" /> : <Maximize data-icon="inline-start" />}
        {fullscreen ? "退出全屏" : "全屏显示"}
      </Button>
    </div>
  )
}
