"use client"

import Link from "next/link"
import { useState } from "react"
import { Hexagon, Settings2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { SettingsDialog } from "@/components/settings-dialog"

export function AppHeader({
  trailing,
}: {
  trailing?: React.ReactNode
}) {
  const [open, setOpen] = useState(false)

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border/80 bg-background/80 px-4 backdrop-blur-md">
      <Link href="/" className="flex items-center gap-2.5">
        <span className="flex size-8 items-center justify-center rounded-lg bg-primary/15 text-primary ring-1 ring-primary/30">
          <Hexagon className="size-4 fill-current/20" />
        </span>
        <span className="leading-tight">
          <span className="block text-sm font-semibold tracking-tight">智体工坊</span>
          <span className="block text-[11px] text-muted-foreground">Agent Studio</span>
        </span>
      </Link>
      <div className="ml-auto flex items-center gap-2">
        {trailing}
        <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
          <Settings2 data-icon="inline-start" />
          模型设置
        </Button>
      </div>
      <SettingsDialog open={open} onOpenChange={setOpen} />
    </header>
  )
}
