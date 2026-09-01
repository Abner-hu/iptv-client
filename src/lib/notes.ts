const PREFIX = "agent-studio:notes:"

export function listNotes(agentId: string): string[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(`${PREFIX}${agentId}`)
    return raw ? (JSON.parse(raw) as string[]) : []
  } catch {
    return []
  }
}

export function saveNote(agentId: string, note: string): string[] {
  const next = [...listNotes(agentId), note.trim()].filter(Boolean).slice(-40)
  localStorage.setItem(`${PREFIX}${agentId}`, JSON.stringify(next))
  return next
}
