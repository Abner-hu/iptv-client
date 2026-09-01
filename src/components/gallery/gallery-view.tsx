"use client"

import { useRouter } from "next/navigation"
import { Bot, Clock, Copy, Plus, Sparkles, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { AppHeader } from "@/components/app-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useAgents } from "@/hooks/use-agents"
import { TOOL_CATALOG } from "@/lib/tools"

function formatUpdated(ts: number) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(ts)
}

export function GalleryView() {
  const router = useRouter()
  const { agents, ready, createAgent, duplicateAgent, removeAgent } = useAgents()

  function onCreate() {
    const agent = createAgent()
    router.push(`/agents/${agent.id}`)
  }

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <AppHeader
        trailing={
          <Button size="sm" onClick={onCreate} disabled={!ready}>
            <Plus data-icon="inline-start" />
            新建 Agent
          </Button>
        }
      />
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-8 sm:px-6">
        <section className="relative overflow-hidden rounded-2xl border border-primary/20 bg-[radial-gradient(1200px_circle_at_0%_-20%,color-mix(in_oklch,var(--primary)_22%,transparent),transparent_55%),linear-gradient(180deg,color-mix(in_oklch,var(--card)_88%,transparent),var(--card))] px-5 py-8 sm:px-10 sm:py-12">
          <p className="text-xs font-medium tracking-[0.18em] text-primary uppercase">
            Agent 开发工作台
          </p>
          <h1 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            设计人设、装配工具、在操场里把循环跑通
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
            智体工坊把系统提示词、工具开关和运行轨迹放在同一块屏幕上。打开预置 Agent
            就能看到工具调用；接入 OpenAI 兼容接口后可换成真实模型。
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <Button onClick={onCreate}>
              <Sparkles data-icon="inline-start" />
              从空白 Agent 开始
            </Button>
            <Button variant="outline" asChild>
              <a href="#gallery">查看工坊里的 Agent</a>
            </Button>
          </div>
        </section>

        <section id="gallery" className="mt-10">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">我的 Agent</h2>
              <p className="text-sm text-muted-foreground">
                数据保存在本机浏览器，刷新不会丢失。
              </p>
            </div>
            {ready && (
              <Badge variant="secondary">{agents.length} 个</Badge>
            )}
          </div>

          {!ready ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-48 animate-pulse rounded-xl bg-muted/60"
                />
              ))}
            </div>
          ) : agents.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed px-6 py-16 text-center">
              <Bot className="size-10 text-muted-foreground" />
              <h3 className="mt-4 text-base font-medium">工坊还是空的</h3>
              <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                新建一个 Agent，写好人设并打开工具，就可以在操场里试第一轮对话。
              </p>
              <Button className="mt-6" onClick={onCreate}>
                新建 Agent
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {agents.map((agent) => (
                <Card
                  key={agent.id}
                  className="cursor-pointer transition-colors hover:ring-primary/30"
                  onClick={() => router.push(`/agents/${agent.id}`)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base">{agent.name}</CardTitle>
                      <Badge variant="outline">{agent.toolIds.length} 工具</Badge>
                    </div>
                    <CardDescription className="line-clamp-2 min-h-10">
                      {agent.description || "还没有简介，点进去补一段。"}
                    </CardDescription>
                  </CardHeader>
                  <div className="flex flex-wrap gap-1.5 px-4">
                    {agent.toolIds.length === 0 ? (
                      <span className="text-xs text-muted-foreground">未装配工具</span>
                    ) : (
                      agent.toolIds.map((id) => {
                        const tool = TOOL_CATALOG.find((item) => item.id === id)
                        return (
                          <Badge key={id} variant="secondary">
                            {tool?.title ?? id}
                          </Badge>
                        )
                      })
                    )}
                  </div>
                  <CardFooter className="mt-auto flex items-center justify-between border-t">
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="size-3" />
                      {formatUpdated(agent.updatedAt)}
                    </span>
                    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="复制"
                        onClick={() => {
                          const copy = duplicateAgent(agent.id)
                          if (copy) {
                            toast.success(`已复制「${copy.name}」`)
                            router.push(`/agents/${copy.id}`)
                          }
                        }}
                      >
                        <Copy />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="删除"
                        onClick={() => {
                          removeAgent(agent.id)
                          toast.success(`已删除「${agent.name}」`)
                        }}
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
