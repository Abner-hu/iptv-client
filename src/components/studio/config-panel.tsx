"use client"

import { Calculator, Clock, Library, NotebookPen } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { TOOL_CATALOG } from "@/lib/tools"
import type { Agent } from "@/lib/types"

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  calculator: Calculator,
  get_current_time: Clock,
  knowledge_lookup: Library,
  save_note: NotebookPen,
  list_notes: NotebookPen,
}

export function ConfigPanel({
  agent,
  onChange,
}: {
  agent: Agent
  onChange: (patch: Partial<Agent>) => void
}) {
  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-2">
        <Label htmlFor="agent-name">名称</Label>
        <Input
          id="agent-name"
          value={agent.name}
          onChange={(e) => onChange({ name: e.target.value })}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="agent-desc">简介</Label>
        <Textarea
          id="agent-desc"
          value={agent.description}
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder="一句话说明这个 Agent 解决什么问题"
        />
      </div>
      <div className="grid gap-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="agent-prompt">系统提示词</Label>
          <Badge variant="outline">{agent.systemPrompt.length} 字</Badge>
        </div>
        <Textarea
          id="agent-prompt"
          value={agent.systemPrompt}
          onChange={(e) => onChange({ systemPrompt: e.target.value })}
          className="min-h-48 font-mono text-xs leading-5"
        />
        <p className="text-xs text-muted-foreground">
          写清角色、何时用哪个工具、输出格式和禁止事项。演示引擎会读取「简洁 / 短句」等风格词。
        </p>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="agent-model">模型名</Label>
        <Input
          id="agent-model"
          value={agent.model}
          onChange={(e) => onChange({ model: e.target.value })}
          placeholder="demo-agent 或 gpt-4o-mini"
        />
        <p className="text-xs text-muted-foreground">
          演示模式下忽略此项。接入真实接口后，填写上游模型名；留着 demo-agent 则使用设置里的默认模型。
        </p>
      </div>
      <div className="grid gap-2">
        <div className="flex items-center justify-between">
          <Label>温度 {agent.temperature.toFixed(1)}</Label>
        </div>
        <Slider
          min={0}
          max={1}
          step={0.1}
          value={[agent.temperature]}
          onValueChange={(value) => onChange({ temperature: value[0] ?? 0 })}
        />
      </div>
      <div className="grid gap-3">
        <Label>工具</Label>
        <div className="grid gap-2">
          {TOOL_CATALOG.map((tool) => {
            const Icon = ICONS[tool.id] ?? Library
            const checked = agent.toolIds.includes(tool.id)
            return (
              <label
                key={tool.id}
                className="flex cursor-pointer items-start gap-3 rounded-lg border border-border/80 bg-card/40 p-3 has-focus-visible:ring-2 has-focus-visible:ring-ring/50"
              >
                <Icon className="mt-0.5 size-4 shrink-0 text-primary" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">{tool.title}</span>
                    <Switch
                      checked={checked}
                      onCheckedChange={(on) => {
                        const toolIds = on
                          ? [...new Set([...agent.toolIds, tool.id])]
                          : agent.toolIds.filter((id) => id !== tool.id)
                        onChange({ toolIds })
                      }}
                    />
                  </div>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    {tool.description}
                  </p>
                </div>
              </label>
            )
          })}
        </div>
      </div>
    </div>
  )
}
