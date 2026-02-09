"use client";

import { useEffect, useState, useCallback } from "react";
import { useGateway } from "@/hooks/use-gateway";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AgentFileName } from "@/types/gateway";
import {
  Bot,
  Zap,
  Play,
  Pause,
  Save,
  FileText,
  Brain,
  User,
  Wrench,
  Heart,
  Ghost,
  Shield,
  Send,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";

const AGENT_FILES: { name: AgentFileName; label: string; icon: typeof FileText }[] = [
  { name: "MEMORY.md", label: "Memory", icon: Brain },
  { name: "SOUL.md", label: "Soul", icon: Ghost },
  { name: "IDENTITY.md", label: "Identity", icon: Shield },
  { name: "USER.md", label: "User", icon: User },
  { name: "TOOLS.md", label: "Tools", icon: Wrench },
  { name: "HEARTBEAT.md", label: "Heartbeat", icon: Heart },
  { name: "AGENTS.md", label: "Agents", icon: Bot },
];

export function AgentDetail({ agentId }: { agentId: string }) {
  const {
    agents,
    sessions,
    triggerAgent,
    pauseAgent,
    resumeAgent,
    getAgentFile,
    setAgentFile,
    sendChat,
  } = useGateway();
  const agent = agents.find((a) => a.id === agentId);

  const [activeFile, setActiveFile] = useState<AgentFileName>("MEMORY.md");
  const [fileContent, setFileContent] = useState<string>("");
  const [fileLoading, setFileLoading] = useState(false);
  const [fileDirty, setFileDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [chatMessage, setChatMessage] = useState("");
  const [chatSending, setChatSending] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const agentSessions = sessions.filter((s) => s.agentId === agentId);

  const loadFile = useCallback(async (fileName: AgentFileName) => {
    setFileLoading(true);
    setFileDirty(false);
    try {
      const content = await getAgentFile(agentId, fileName);
      setFileContent(content);
    } catch {
      setFileContent("(Failed to load file)");
    } finally {
      setFileLoading(false);
    }
  }, [agentId, getAgentFile]);

  useEffect(() => {
    loadFile(activeFile);
  }, [activeFile, loadFile]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await setAgentFile(agentId, activeFile, fileContent);
      setFileDirty(false);
    } catch (err) {
      console.error("Save failed:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleSendChat = async () => {
    if (!chatMessage.trim()) return;
    setChatSending(true);
    try {
      await sendChat(agentId, chatMessage);
      setChatMessage("");
    } catch (err) {
      console.error("Send failed:", err);
    } finally {
      setChatSending(false);
    }
  };

  const handleAction = async (action: () => Promise<void>, id: string) => {
    setActionLoading(id);
    try {
      await action();
    } finally {
      setActionLoading(null);
    }
  };

  if (!agent) {
    return (
      <div className="space-y-4">
        <Link href="/agents" className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-200">
          <ArrowLeft className="h-4 w-4" /> Back to Fleet
        </Link>
        <div className="py-16 text-center text-sm text-zinc-500">Agent &quot;{agentId}&quot; not found</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link href="/agents" className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-200">
        <ArrowLeft className="h-4 w-4" /> Back to Fleet
      </Link>

      {/* Agent Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <span className="text-4xl">{agent.emoji ?? "🤖"}</span>
          <div>
            <h1 className="text-2xl font-bold">{agent.name || agent.id}</h1>
            <p className="text-sm font-mono text-zinc-500">{agent.id}</p>
            <div className="mt-2 flex items-center gap-3">
              <StatusBadge
                status={agent.enabled ? agent.status : "offline"}
                pulse={agent.status === "online" || agent.status === "busy"}
                size="md"
              />
              <span className="text-xs text-zinc-500">
                {agent.model ?? "default"} · {agent.provider ?? "default"}
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="primary"
            icon={Zap}
            loading={actionLoading === "trigger"}
            onClick={() => handleAction(() => triggerAgent(agentId), "trigger")}
          >
            Trigger
          </Button>
          {agent.enabled ? (
            <Button
              variant="danger"
              icon={Pause}
              loading={actionLoading === "pause"}
              onClick={() => handleAction(() => pauseAgent(agentId), "pause")}
            >
              Pause
            </Button>
          ) : (
            <Button
              variant="primary"
              icon={Play}
              loading={actionLoading === "resume"}
              onClick={() => handleAction(() => resumeAgent(agentId), "resume")}
            >
              Resume
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Agent Files (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold">Agent Files</h2>
                {fileDirty && (
                  <Button size="sm" variant="primary" icon={Save} loading={saving} onClick={handleSave}>
                    Save Changes
                  </Button>
                )}
              </div>
              {/* File tabs */}
              <div className="mt-3 flex flex-wrap gap-1">
                {AGENT_FILES.map(({ name, label, icon: Icon }) => (
                  <button
                    key={name}
                    onClick={() => setActiveFile(name)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                      activeFile === name
                        ? "bg-zinc-800 text-zinc-100"
                        : "text-zinc-500 hover:bg-zinc-800/50 hover:text-zinc-300"
                    )}
                  >
                    <Icon className="h-3 w-3" />
                    {label}
                  </button>
                ))}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {fileLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-700 border-t-emerald-400" />
                </div>
              ) : (
                <textarea
                  value={fileContent}
                  onChange={(e) => {
                    setFileContent(e.target.value);
                    setFileDirty(true);
                  }}
                  className="min-h-[400px] w-full resize-y bg-transparent px-5 py-4 font-mono text-xs text-zinc-300 placeholder:text-zinc-700 focus:outline-none"
                  placeholder={`${activeFile} content...`}
                  spellCheck={false}
                />
              )}
            </CardContent>
          </Card>

          {/* Quick Message */}
          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold">Send Message</h2>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSendChat()}
                  placeholder="Send a message to this agent..."
                  className="flex-1 rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-zinc-600 focus:outline-none"
                />
                <Button
                  variant="primary"
                  icon={Send}
                  loading={chatSending}
                  onClick={handleSendChat}
                  disabled={!chatMessage.trim()}
                >
                  Send
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right sidebar */}
        <div className="space-y-4">
          {/* Agent Config */}
          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold">Configuration</h2>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div className="flex justify-between">
                <span className="text-zinc-500">Model</span>
                <span className="font-mono text-zinc-300">{agent.model ?? "default"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Provider</span>
                <span className="font-mono text-zinc-300">{agent.provider ?? "default"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Heartbeat</span>
                <span className="font-mono text-zinc-300">{agent.heartbeatInterval ?? "30m"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Sandbox</span>
                <span className="font-mono text-zinc-300">{agent.sandbox ? "Yes" : "No"}</span>
              </div>
              {agent.channels && agent.channels.length > 0 && (
                <div className="flex justify-between">
                  <span className="text-zinc-500">Channels</span>
                  <span className="font-mono text-zinc-300">{agent.channels.join(", ")}</span>
                </div>
              )}
              {agent.tools && (
                <>
                  {agent.tools.allow && (
                    <div>
                      <span className="text-zinc-500">Allowed Tools</span>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {agent.tools.allow.map((t) => (
                          <span key={t} className="rounded bg-emerald-400/10 px-1.5 py-0.5 text-[10px] text-emerald-400">
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {agent.tools.deny && (
                    <div>
                      <span className="text-zinc-500">Denied Tools</span>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {agent.tools.deny.map((t) => (
                          <span key={t} className="rounded bg-red-400/10 px-1.5 py-0.5 text-[10px] text-red-400">
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Sessions */}
          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold">Sessions ({agentSessions.length})</h2>
            </CardHeader>
            <CardContent className="space-y-2 p-0">
              {agentSessions.length === 0 ? (
                <div className="px-5 py-6 text-center text-xs text-zinc-500">No active sessions</div>
              ) : (
                agentSessions.slice(0, 10).map((session) => (
                  <div key={session.id} className="flex items-center justify-between px-5 py-2">
                    <div>
                      <p className="font-mono text-[10px] text-zinc-400 truncate max-w-[140px]">
                        {session.id}
                      </p>
                      <p className="text-[10px] text-zinc-600">{session.messageCount} messages</p>
                    </div>
                    <StatusBadge status={session.status} />
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
