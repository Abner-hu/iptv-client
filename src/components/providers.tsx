"use client"

import { ThemeProvider } from "next-themes"

import { SettingsProvider } from "@/hooks/use-settings"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Toaster } from "@/components/ui/sonner"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" forcedTheme="dark">
      <SettingsProvider>
        <TooltipProvider delayDuration={200}>
          {children}
          <Toaster position="top-center" />
        </TooltipProvider>
      </SettingsProvider>
    </ThemeProvider>
  )
}
