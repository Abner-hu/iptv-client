import { AgentStudio } from "@/components/studio/agent-studio"

export default async function AgentPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <AgentStudio agentId={id} />
}
