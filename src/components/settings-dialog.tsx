"use client"

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useSettings } from "@/hooks/use-settings"

export function SettingsDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { settings, updateSettings } = useSettings()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>运行时设置</DialogTitle>
          <DialogDescription>
            默认使用演示引擎，无需密钥即可调试工具循环。接入 OpenAI 兼容接口后，密钥只保存在本机浏览器。
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="mode">运行模式</Label>
            <Select
              value={settings.mode}
              onValueChange={(value) =>
                updateSettings({ mode: value as "demo" | "openai" })
              }
            >
              <SelectTrigger id="mode" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="demo">演示引擎（本地，无需密钥）</SelectItem>
                <SelectItem value="openai">OpenAI 兼容接口</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="baseUrl">Base URL</Label>
            <Input
              id="baseUrl"
              value={settings.baseUrl}
              onChange={(e) => updateSettings({ baseUrl: e.target.value })}
              placeholder="https://api.openai.com/v1"
              disabled={settings.mode !== "openai"}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="apiKey">API Key</Label>
            <Input
              id="apiKey"
              type="password"
              autoComplete="off"
              value={settings.apiKey}
              onChange={(e) => updateSettings({ apiKey: e.target.value })}
              placeholder="sk-..."
              disabled={settings.mode !== "openai"}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="defaultModel">默认模型</Label>
            <Input
              id="defaultModel"
              value={settings.defaultModel}
              onChange={(e) => updateSettings({ defaultModel: e.target.value })}
              placeholder="gpt-4o-mini"
              disabled={settings.mode !== "openai"}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              updateSettings({
                mode: "demo",
                apiKey: "",
                baseUrl: "https://api.openai.com/v1",
                defaultModel: "gpt-4o-mini",
              })
              toast.success("已恢复演示引擎")
            }}
          >
            恢复演示
          </Button>
          <Button onClick={() => onOpenChange(false)}>完成</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
