"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useMemo, useState } from "react"
import { ArrowLeft, Copy, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { AppHeader } from "@/components/app-header"
import { ConfigPanel } from "@/components/studio/config-panel"
import { Playground } from "@/components/studio/playground"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAgents } from "@/hooks/use-agents"
import { useSettings } from "@/hooks/use-settings"
import { cn } from "@/lib/utils"

export function AgentStudio({ agentId }: { agentId: string }) {
  const router = useRouter()
  const { agents, ready, updateAgent, duplicateAgent, removeAgent } = useAgents()
  const { settings } = useSettings()
  const [tab, setTab] = useState("play")
  const agent = useMemo(
    () => agents.find((item) => item.id === agentId),
    [agents, agentId],
  )

  if (!ready) {
    return (
      <div className="flex min-h-full flex-1 flex-col">
        <AppHeader />
        <div className="grid flex-1 gap-4 p-4 lg:grid-cols-[minmax(280px,380px)_1fr]">
          <div className="animate-pulse rounded-xl bg-muted/50" />
          <div className="animate-pulse rounded-xl bg-muted/40" />
        </div>
      </div>
    )
  }

  if (!agent) {
    return (
      <div className="flex min-h-full flex-1 flex-col">
        <AppHeader />
        <div className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center px-4 text-center">
          <h1 className="text-xl font-semibold">找不到这个 Agent</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            它可能已被删除，或当前浏览器没有对应的本地数据。
          </p>
          <Button className="mt-6" asChild>
            <Link href="/">返回工坊</Link>
          </Button>
        </div>
      </div>
    )
  }

  const modeLabel =
    settings.mode === "openai" && settings.apiKey.trim()
      ? "OpenAI 兼容"
      : "演示引擎"

  return (
    <div className="flex h-dvh min-h-0 flex-col overflow-hidden">
      <AppHeader
        trailing={
          <>
            <Badge variant="secondary">{modeLabel}</Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const copy = duplicateAgent(agent.id)
                if (copy) {
                  toast.success("已复制")
                  router.push(`/agents/${copy.id}`)
                }
              }}
            >
              <Copy data-icon="inline-start" />
              复制
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                removeAgent(agent.id)
                toast.success("已删除")
                router.push("/")
              }}
            >
              <Trash2 data-icon="inline-start" />
              删除
            </Button>
          </>
        }
      />
      <div className="flex items-center gap-2 border-b px-4 py-2">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/">
            <ArrowLeft data-icon="inline-start" />
            工坊
          </Link>
        </Button>
        <span className="truncate text-sm font-medium">{agent.name}</span>
      </div>

      <div className="border-b px-3 pt-2 lg:hidden">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="w-full">
            <TabsTrigger value="play" className="flex-1">
              操场
            </TabsTrigger>
            <TabsTrigger value="config" className="flex-1">
              配置
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="flex min-h-0 flex-1">
        <aside
          className={cn(
            "min-h-0 w-full overflow-y-auto p-4 lg:block lg:w-[400px] lg:shrink-0 lg:border-r",
            tab === "config" ? "block" : "hidden",
          )}
        >
          <ConfigPanel
            agent={agent}
            onChange={(patch) =>
              updateAgent(agent.id, {
                ...patch,
                updatedAt: agent.updatedAt + 1,
              })
            }
          />
        </aside>
        <div
          className={cn(
            "min-h-0 min-w-0 flex-1 flex-col",
            tab === "play" ? "flex" : "hidden",
            "lg:flex",
          )}
        >
          <Playground agent={agent} settings={settings} />
        </div>
      </div>
    </div>
  )
}
