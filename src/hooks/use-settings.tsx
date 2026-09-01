"use client"

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react"

import {
  DEFAULT_SETTINGS,
  getSettingsServerSnapshot,
  getSettingsSnapshot,
  saveSettings as persistSettings,
  subscribeSettings,
} from "@/lib/storage"
import type { Settings } from "@/lib/types"

type SettingsContextValue = {
  settings: Settings
  ready: boolean
  updateSettings: (patch: Partial<Settings>) => void
}

const SettingsContext = createContext<SettingsContextValue | null>(null)

export function SettingsProvider({ children }: { children: ReactNode }) {
  const settings = useSyncExternalStore(
    subscribeSettings,
    getSettingsSnapshot,
    getSettingsServerSnapshot,
  )

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    persistSettings({ ...getSettingsSnapshot(), ...patch })
  }, [])

  const value = useMemo(
    () => ({ settings, ready: true, updateSettings }),
    [settings, updateSettings],
  )

  return (
    <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
  )
}

export function useSettings() {
  const ctx = useContext(SettingsContext)
  if (!ctx) {
    throw new Error("useSettings 必须在 SettingsProvider 内使用")
  }
  return ctx
}

export { DEFAULT_SETTINGS }
