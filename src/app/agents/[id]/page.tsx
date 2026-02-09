"use client";

import { use } from "react";
import { AgentDetail } from "@/components/dashboard/agent-detail";

export default function AgentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <AgentDetail agentId={id} />;
}
