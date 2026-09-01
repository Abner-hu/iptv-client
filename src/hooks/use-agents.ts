"use client"

import { useCallback, useSyncExternalStore } from "react"

import { blankAgent } from "@/lib/seed"
import {
  getAgentsServerSnapshot,
  getAgentsSnapshot,
  loadAgents,
  saveAgents,
  subscribeAgents,
} from "@/lib/storage"
import type { Agent } from "@/lib/types"

const subscribeClient = () => () => {}

export function useAgents() {
  const agents = useSyncExternalStore(
    subscribeAgents,
    getAgentsSnapshot,
    getAgentsServerSnapshot,
  )
  const ready = useSyncExternalStore(subscribeClient, () => true, () => false)

  const createAgent = useCallback(() => {
    const agent = blankAgent()
    saveAgents([agent, ...loadAgents()])
    return agent
  }, [])

  const updateAgent = useCallback((id: string, patch: Partial<Agent>) => {
    saveAgents(
      loadAgents().map((agent) =>
        agent.id === id ? { ...agent, ...patch, updatedAt: patch.updatedAt ?? agent.updatedAt } : agent,
      ),
    )
  }, [])

  const duplicateAgent = useCallback((id: string) => {
    const current = loadAgents()
    const source = current.find((agent) => agent.id === id)
    if (!source) return null
    const stamp = source.updatedAt
    const copy: Agent = {
      ...source,
      id: crypto.randomUUID(),
      name: `${source.name} 副本`,
      createdAt: stamp,
      updatedAt: stamp,
    }
    saveAgents([copy, ...current])
    return copy
  }, [])

  const removeAgent = useCallback((id: string) => {
    saveAgents(loadAgents().filter((agent) => agent.id !== id))
  }, [])

  return { agents, ready, createAgent, updateAgent, duplicateAgent, removeAgent }
}
