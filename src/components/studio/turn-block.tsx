"use client"

import { AlertCircle, Loader2, Wrench } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { ChatTurn, TraceStep } from "@/lib/types"

function ToolStep({ step }: { step: Extract<TraceStep, { type: "tool" }> }) {
  return (
    <div
      className={cn(
        "rounded-lg border bg-background/60 px-3 py-2 font-mono text-[11px] leading-5",
        step.error ? "border-destructive/40" : "border-border/70",
      )}
    >
      <div className="flex items-center gap-2 text-xs font-sans">
        <Wrench className="size-3.5 text-primary" />
        <span className="font-medium">{step.name}</span>
        <span className="text-muted-foreground">{step.durationMs}ms</span>
        {step.error && (
          <Badge variant="destructive">失败</Badge>
        )}
      </div>
      <pre className="mt-1 overflow-x-auto whitespace-pre-wrap text-muted-foreground">
        {JSON.stringify(step.args, null, 0)}
      </pre>
      <p className="mt-1 whitespace-pre-wrap text-foreground/90">
        {step.error || step.result}
      </p>
    </div>
  )
}

export function TurnBlock({ turn }: { turn: ChatTurn }) {
  const toolSteps = turn.steps.filter(
    (step): step is Extract<TraceStep, { type: "tool" }> => step.type === "tool",
  )
  const llmSteps = turn.steps.filter((step) => step.type === "llm")
  const errors = turn.steps.filter((step) => step.type === "error")

  return (
    <div className="grid gap-3">
      <div className="ml-auto max-w-[90%] rounded-2xl rounded-br-md bg-primary px-3.5 py-2.5 text-sm leading-6 text-primary-foreground">
        {turn.userText}
      </div>
      <div className="max-w-[95%] space-y-2 rounded-2xl rounded-bl-md border border-border/80 bg-card/80 px-3.5 py-3">
        {llmSteps.map((step) =>
          step.type === "llm" ? (
            <p key={step.id} className="text-[11px] tracking-wide text-muted-foreground uppercase">
              {step.label}
              {turn.status === "running" && (
                <Loader2 className="ml-2 inline size-3 animate-spin" />
              )}
            </p>
          ) : null,
        )}
        {toolSteps.map((step) => (
          <ToolStep key={step.id} step={step} />
        ))}
        {errors.map((step) =>
          step.type === "error" ? (
            <p key={step.id} className="flex items-start gap-2 text-sm text-destructive">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              {step.text}
            </p>
          ) : null,
        )}
        {turn.assistantText && (
          <div className="whitespace-pre-wrap text-sm leading-6">{turn.assistantText}</div>
        )}
        {turn.status === "running" && !turn.assistantText && (
          <p className="text-sm text-muted-foreground">正在规划下一步…</p>
        )}
        {turn.status === "error" && turn.error && !errors.length && (
          <p className="text-sm text-destructive">{turn.error}</p>
        )}
      </div>
    </div>
  )
}
