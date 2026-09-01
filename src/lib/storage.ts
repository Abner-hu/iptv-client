import { createSeedAgents } from "@/lib/seed"
import type { Agent, ChatTurn, Settings } from "@/lib/types"

const AGENTS_KEY = "agent-studio:agents"
const SETTINGS_KEY = "agent-studio:settings"
const TURNS_PREFIX = "agent-studio:turns:"

export const DEFAULT_SETTINGS: Settings = {
  mode: "demo",
  apiKey: "",
  baseUrl: "https://api.openai.com/v1",
  defaultModel: "gpt-4o-mini",
}

const EMPTY_AGENTS: Agent[] = []
const EMPTY_TURNS: ChatTurn[] = []

let agentsCache: Agent[] = EMPTY_AGENTS
let agentsRaw: string | null = null
let settingsCache: Settings = DEFAULT_SETTINGS
let settingsRaw: string | null = null
const turnsCache = new Map<string, { raw: string | null; value: ChatTurn[] }>()

const agentListeners = new Set<() => void>()
const settingsListeners = new Set<() => void>()
const turnListeners = new Set<() => void>()

function emit(listeners: Set<() => void>) {
  for (const listener of listeners) listener()
}

function readRaw(key: string): string | null {
  if (typeof window === "undefined") return null
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function parseJson<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function ensureSeeded() {
  if (typeof window === "undefined") return
  if (readRaw(AGENTS_KEY)) return
  const seeded = createSeedAgents()
  const serialized = JSON.stringify(seeded)
  localStorage.setItem(AGENTS_KEY, serialized)
  agentsRaw = serialized
  agentsCache = seeded
}

export function getAgentsSnapshot(): Agent[] {
  const raw = readRaw(AGENTS_KEY)
  if (raw === agentsRaw && agentsCache !== EMPTY_AGENTS) return agentsCache
  if (!raw) {
    agentsRaw = raw
    agentsCache = EMPTY_AGENTS
    return agentsCache
  }
  agentsRaw = raw
  const stored = parseJson<Agent[] | null>(raw, null)
  agentsCache = Array.isArray(stored) ? stored : EMPTY_AGENTS
  return agentsCache
}

export function getAgentsServerSnapshot(): Agent[] {
  return EMPTY_AGENTS
}

export function subscribeAgents(listener: () => void) {
  ensureSeeded()
  agentListeners.add(listener)
  return () => {
    agentListeners.delete(listener)
  }
}

export function saveAgents(agents: Agent[]) {
  const serialized = JSON.stringify(agents)
  localStorage.setItem(AGENTS_KEY, serialized)
  agentsRaw = serialized
  agentsCache = agents
  emit(agentListeners)
}

export function getSettingsSnapshot(): Settings {
  const raw = readRaw(SETTINGS_KEY)
  if (raw === settingsRaw) return settingsCache
  settingsRaw = raw
  settingsCache = { ...DEFAULT_SETTINGS, ...parseJson<Partial<Settings>>(raw, {}) }
  return settingsCache
}

export function getSettingsServerSnapshot(): Settings {
  return DEFAULT_SETTINGS
}

export function subscribeSettings(listener: () => void) {
  settingsListeners.add(listener)
  return () => {
    settingsListeners.delete(listener)
  }
}

export function saveSettings(settings: Settings) {
  const serialized = JSON.stringify(settings)
  localStorage.setItem(SETTINGS_KEY, serialized)
  settingsRaw = serialized
  settingsCache = settings
  emit(settingsListeners)
}

export function getTurnsSnapshot(agentId: string): ChatTurn[] {
  const key = `${TURNS_PREFIX}${agentId}`
  const raw = readRaw(key)
  const cached = turnsCache.get(agentId)
  if (cached && cached.raw === raw) return cached.value
  const value = parseJson<ChatTurn[]>(raw, EMPTY_TURNS)
  turnsCache.set(agentId, { raw, value })
  return value
}

export function getTurnsServerSnapshot(): ChatTurn[] {
  return EMPTY_TURNS
}

export function subscribeTurns(listener: () => void) {
  turnListeners.add(listener)
  return () => {
    turnListeners.delete(listener)
  }
}

export function saveTurns(agentId: string, turns: ChatTurn[]) {
  const value = turns.slice(-80)
  const serialized = JSON.stringify(value)
  localStorage.setItem(`${TURNS_PREFIX}${agentId}`, serialized)
  turnsCache.set(agentId, { raw: serialized, value })
  emit(turnListeners)
}

export function loadAgents(): Agent[] {
  ensureSeeded()
  return getAgentsSnapshot()
}

export function loadSettings(): Settings {
  return getSettingsSnapshot()
}

export function loadTurns(agentId: string): ChatTurn[] {
  return getTurnsSnapshot(agentId)
}
