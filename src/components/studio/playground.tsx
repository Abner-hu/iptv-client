"use client"

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react"
import { ArrowUp, Eraser } from "lucide-react"
import { toast } from "sonner"

import { TurnBlock } from "@/components/studio/turn-block"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { uid } from "@/lib/id"
import { runAgentTurn } from "@/lib/run-agent"
import {
  getTurnsServerSnapshot,
  getTurnsSnapshot,
  saveTurns,
  subscribeTurns,
} from "@/lib/storage"
import { getToolsByIds } from "@/lib/tools"
import type { Agent, ChatTurn, Settings, TraceStep } from "@/lib/types"

function suggestionsFor(agent: Agent): string[] {
  const ids = new Set(agent.toolIds)
  const items: string[] = []
  if (ids.has("knowledge_lookup")) items.push("什么是 ReAct Agent？")
  if (ids.has("calculator")) items.push("计算 (17.5 - 3) * 8")
  if (ids.has("get_current_time")) items.push("现在上海和纽约分别几点？")
  if (ids.has("save_note")) items.push("记住：我偏好简洁的中文回复")
  if (ids.has("list_notes")) items.push("我让你记住过什么？")
  if (items.length === 0) items.push("先介绍一下你能做什么")
  return items.slice(0, 4)
}

export function Playground({
  agent,
  settings,
}: {
  agent: Agent
  settings: Settings
}) {
  const agentId = agent.id
  const turns = useSyncExternalStore(
    subscribeTurns,
    () => getTurnsSnapshot(agentId),
    getTurnsServerSnapshot,
  )
  const [draft, setDraft] = useState("")
  const [busy, setBusy] = useState(false)
  const scroller = useRef<HTMLDivElement>(null)
  const suggestions = useMemo(() => suggestionsFor(agent), [agent])
  const tools = getToolsByIds(agent.toolIds)
  const usingDemo = settings.mode !== "openai" || !settings.apiKey.trim()

  useEffect(() => {
    scroller.current?.scrollTo({
      top: scroller.current.scrollHeight,
      behavior: "smooth",
    })
  }, [turns])

  function patchTurns(updater: (prev: ChatTurn[]) => ChatTurn[]) {
    saveTurns(agentId, updater(getTurnsSnapshot(agentId)))
  }

  async function send(text: string) {
    const userText = text.trim()
    if (!userText || busy) return
    setDraft("")
    setBusy(true)
    const turnId = uid()
    const history = getTurnsSnapshot(agentId).filter((turn) => turn.status === "done")
    const pending: ChatTurn = {
      id: turnId,
      userText,
      assistantText: "",
      steps: [],
      status: "running",
      createdAt: history.length + 1,
    }
    patchTurns((prev) => [...prev, pending])

    const result = await runAgentTurn({
      agent,
      history,
      userText,
      settings,
      onStep: (step: TraceStep) => {
        patchTurns((prev) =>
          prev.map((turn) =>
            turn.id === turnId ? { ...turn, steps: [...turn.steps, step] } : turn,
          ),
        )
      },
    })

    patchTurns((prev) =>
      prev.map((turn) =>
        turn.id === turnId
          ? {
              ...turn,
              assistantText: result.assistantText,
              steps: result.steps,
              status: result.status,
              error: result.error,
            }
          : turn,
      ),
    )
    setBusy(false)
    if (result.status === "error") {
      toast.error(result.error || "本轮运行失败")
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between gap-2 border-b px-4 py-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">操场</p>
          <p className="truncate text-xs text-muted-foreground">
            {usingDemo
              ? "演示引擎 · 工具在本地执行"
              : `真实模型 · ${agent.model === "demo-agent" ? settings.defaultModel : agent.model}`}
            {tools.length ? ` · ${tools.map((t) => t.title).join("、")}` : " · 无工具"}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          disabled={turns.length === 0 || busy}
          onClick={() => {
            saveTurns(agentId, [])
            toast.success("对话已清空")
          }}
        >
          <Eraser data-icon="inline-start" />
          清空
        </Button>
      </div>

      <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {turns.length === 0 ? (
          <div className="flex h-full min-h-64 flex-col items-center justify-center text-center">
            <p className="text-sm font-medium">还没有对话</p>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              选一条示例，或自己输入。演示引擎会真实调用计算器、时间、知识库和笔记。
            </p>
            <div className="mt-5 flex max-w-lg flex-wrap justify-center gap-2">
              {suggestions.map((item) => (
                <Button
                  key={item}
                  variant="outline"
                  size="sm"
                  className="h-auto max-w-full whitespace-normal py-1.5 text-left"
                  onClick={() => void send(item)}
                >
                  {item}
                </Button>
              ))}
            </div>
          </div>
        ) : (
          <div className="mx-auto flex max-w-2xl flex-col gap-6">
            {turns.map((turn) => (
              <TurnBlock key={turn.id} turn={turn} />
            ))}
          </div>
        )}
      </div>

      <form
        className="border-t p-3"
        onSubmit={(e) => {
          e.preventDefault()
          void send(draft)
        }}
      >
        <div className="mx-auto flex max-w-2xl items-end gap-2 rounded-xl border bg-input/20 p-2">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="对这个 Agent 说一句话…"
            className="min-h-12 flex-1 resize-none border-0 bg-transparent shadow-none dark:bg-transparent"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                void send(draft)
              }
            }}
            disabled={busy}
          />
          <Button type="submit" size="icon" disabled={busy || !draft.trim()} aria-label="发送">
            <ArrowUp />
          </Button>
        </div>
        <p className="mx-auto mt-2 max-w-2xl text-center text-[11px] text-muted-foreground">
          Enter 发送 · Shift+Enter 换行
          {usingDemo && settings.mode === "openai"
            ? " · 未填写密钥，已回退到演示引擎"
            : ""}
        </p>
      </form>
    </div>
  )
}
