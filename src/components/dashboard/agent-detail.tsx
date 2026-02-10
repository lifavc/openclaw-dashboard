"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useGateway } from "@/hooks/use-gateway";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Skeleton, ListSkeleton } from "@/components/ui/skeleton";
import { cn, formatRelativeTime } from "@/lib/utils";
import type { AgentFileName, ChatMessage, MemoryEntry } from "@/types/gateway";
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
  MessageSquare,
  Search,
  ChevronDown,
  ChevronRight,
  StopCircle,
  Hash,
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

type Tab = "files" | "chat" | "sessions" | "memory";

export function AgentDetail({ agentId }: { agentId: string }) {
  const {
    agents, sessions, triggerAgent, pauseAgent, resumeAgent,
    getAgentFile, setAgentFile, sendChat, getChatHistory,
    getSessionHistory, searchMemory,
  } = useGateway();
  const agent = agents.find((a) => a.id === agentId);

  const [activeTab, setActiveTab] = useState<Tab>("files");
  const [activeFile, setActiveFile] = useState<AgentFileName>("MEMORY.md");
  const [fileContent, setFileContent] = useState("");
  const [fileLoading, setFileLoading] = useState(false);
  const [fileDirty, setFileDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatSending, setChatSending] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Session explorer state
  const [expandedSession, setExpandedSession] = useState<string | null>(null);
  const [sessionMessages, setSessionMessages] = useState<ChatMessage[]>([]);
  const [sessionLoading, setSessionLoading] = useState(false);

  // Memory search state
  const [memoryQuery, setMemoryQuery] = useState("");
  const [memoryResults, setMemoryResults] = useState<MemoryEntry[]>([]);
  const [memorySearching, setMemorySearching] = useState(false);

  const agentSessions = sessions.filter((s) => s.agentId === agentId);
  const subagentSessions = agentSessions.filter((s) =>
    s.key?.includes(":subagent:") || s.key?.includes(":cron:")
  );
  const mainSessions = agentSessions.filter((s) =>
    !s.key?.includes(":subagent:") && !s.key?.includes(":cron:")
  );

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
    if (activeTab === "files") loadFile(activeFile);
  }, [activeFile, activeTab, loadFile]);

  // Load chat history when switching to chat tab
  useEffect(() => {
    if (activeTab === "chat") {
      setChatLoading(true);
      getChatHistory(agentId, 50)
        .then((msgs) => setChatMessages(msgs))
        .catch(() => setChatMessages([]))
        .finally(() => {
          setChatLoading(false);
          setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
        });
    }
  }, [activeTab, agentId, getChatHistory]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await setAgentFile(agentId, activeFile, fileContent);
      setFileDirty(false);
    } finally {
      setSaving(false);
    }
  };

  const handleSendChat = async () => {
    if (!chatInput.trim()) return;
    const msg = chatInput;
    setChatInput("");
    setChatSending(true);

    // Optimistic add
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: msg,
      timestamp: new Date().toISOString(),
      agentId,
    };
    setChatMessages((prev) => [...prev, userMsg]);

    try {
      await sendChat(agentId, msg);
      // Refresh history to get the response
      const updated = await getChatHistory(agentId, 50);
      setChatMessages(updated);
    } catch {
      // keep the user message visible
    } finally {
      setChatSending(false);
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }
  };

  const handleExpandSession = async (sessionId: string) => {
    if (expandedSession === sessionId) {
      setExpandedSession(null);
      return;
    }
    setExpandedSession(sessionId);
    setSessionLoading(true);
    try {
      const msgs = await getSessionHistory(sessionId, 30);
      setSessionMessages(msgs);
    } catch {
      setSessionMessages([]);
    } finally {
      setSessionLoading(false);
    }
  };

  const handleMemorySearch = async () => {
    if (!memoryQuery.trim()) return;
    setMemorySearching(true);
    try {
      const results = await searchMemory(agentId, memoryQuery);
      setMemoryResults(results);
    } catch {
      setMemoryResults([]);
    } finally {
      setMemorySearching(false);
    }
  };

  const handleAction = async (action: () => Promise<void>, id: string) => {
    setActionLoading(id);
    try { await action(); } finally { setActionLoading(null); }
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

  const tabs: { key: Tab; label: string; icon: typeof FileText }[] = [
    { key: "files", label: "Files", icon: FileText },
    { key: "chat", label: "Chat", icon: MessageSquare },
    { key: "sessions", label: "Sessions", icon: Hash },
    { key: "memory", label: "Memory", icon: Brain },
  ];

  function renderMessageContent(content: string | import("@/types/gateway").ChatMessagePart[]): string {
    if (typeof content === "string") return content;
    return content
      .map((p) => {
        if (p.type === "text") return p.text ?? "";
        if (p.type === "toolCall") return `[Tool: ${p.name}]`;
        if (p.type === "toolResult") return p.result ?? "";
        return "";
      })
      .join("\n");
  }

  return (
    <div className="space-y-6">
      <Link href="/agents" className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-200">
        <ArrowLeft className="h-4 w-4" /> Back to Fleet
      </Link>

      {/* Agent Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <span className="text-4xl">{agent.emoji ?? "🤖"}</span>
          <div>
            <h1 className="text-2xl font-bold">{agent.name || agent.id}</h1>
            <p className="text-sm font-mono text-zinc-500">{agent.id}</p>
            <div className="mt-2 flex items-center gap-3 flex-wrap">
              <StatusBadge
                status={agent.enabled ? agent.status : "offline"}
                pulse={agent.status === "online" || agent.status === "busy"}
                size="md"
              />
              <span className="text-xs text-zinc-500">
                {agent.model ?? "default"} · {agent.provider ?? "default"}
              </span>
              {agent.contextUsage && (
                <span className="text-xs text-zinc-500">
                  Context: {Math.round((agent.contextUsage.used / agent.contextUsage.total) * 100)}%
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="primary" icon={Zap} loading={actionLoading === "trigger"}
            onClick={() => handleAction(() => triggerAgent(agentId), "trigger")}>Trigger</Button>
          {agent.enabled ? (
            <Button variant="danger" icon={Pause} loading={actionLoading === "pause"}
              onClick={() => handleAction(() => pauseAgent(agentId), "pause")}>Pause</Button>
          ) : (
            <Button variant="primary" icon={Play} loading={actionLoading === "resume"}
              onClick={() => handleAction(() => resumeAgent(agentId), "resume")}>Resume</Button>
          )}
        </div>
      </div>

      {/* Tab Bar */}
      <div className="flex gap-1 border-b border-zinc-800 pb-px">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={cn(
              "inline-flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors",
              activeTab === key
                ? "border-emerald-400 text-zinc-100"
                : "border-transparent text-zinc-500 hover:text-zinc-300"
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
            {key === "sessions" && <span className="text-[10px] text-zinc-600">({agentSessions.length})</span>}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main Content (2 cols) */}
        <div className="lg:col-span-2 space-y-4">

          {/* ── Files Tab ── */}
          {activeTab === "files" && (
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
                  <div className="px-5 py-4"><ListSkeleton count={8} /></div>
                ) : (
                  <textarea
                    value={fileContent}
                    onChange={(e) => { setFileContent(e.target.value); setFileDirty(true); }}
                    className="min-h-[400px] w-full resize-y bg-transparent px-5 py-4 font-mono text-xs text-zinc-300 placeholder:text-zinc-700 focus:outline-none"
                    placeholder={`${activeFile} content...`}
                    spellCheck={false}
                  />
                )}
              </CardContent>
            </Card>
          )}

          {/* ── Chat Tab ── */}
          {activeTab === "chat" && (
            <Card>
              <CardHeader>
                <h2 className="text-sm font-semibold">Agent Chat</h2>
              </CardHeader>
              <CardContent className="p-0">
                <div className="h-[500px] overflow-y-auto px-5 py-4 space-y-3">
                  {chatLoading ? (
                    <ListSkeleton count={6} />
                  ) : chatMessages.length === 0 ? (
                    <div className="py-16 text-center text-xs text-zinc-500">
                      No messages yet. Send a message to start a conversation.
                    </div>
                  ) : (
                    chatMessages.map((msg) => (
                      <div
                        key={msg.id}
                        className={cn(
                          "flex gap-3",
                          msg.role === "user" ? "justify-end" : "justify-start"
                        )}
                      >
                        <div
                          className={cn(
                            "max-w-[80%] rounded-xl px-4 py-2.5 text-sm",
                            msg.role === "user"
                              ? "bg-emerald-500/20 text-emerald-100"
                              : msg.role === "tool"
                                ? "bg-blue-500/10 text-blue-200 font-mono text-xs"
                                : "bg-zinc-800 text-zinc-200"
                          )}
                        >
                          <p className="whitespace-pre-wrap break-words">
                            {renderMessageContent(msg.content)}
                          </p>
                          <p className="mt-1 text-[10px] opacity-50">
                            {msg.role} · {msg.timestamp ? formatRelativeTime(msg.timestamp) : ""}
                            {msg.model && ` · ${msg.model}`}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={chatEndRef} />
                </div>
                {/* Chat Input */}
                <div className="border-t border-zinc-800 px-5 py-3">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSendChat()}
                      placeholder="Send a message..."
                      className="flex-1 rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-zinc-600 focus:outline-none"
                      disabled={chatSending}
                    />
                    <Button variant="primary" icon={Send} loading={chatSending}
                      onClick={handleSendChat} disabled={!chatInput.trim()}>Send</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── Sessions Tab ── */}
          {activeTab === "sessions" && (
            <Card>
              <CardHeader>
                <h2 className="text-sm font-semibold">Sessions ({agentSessions.length})</h2>
              </CardHeader>
              <CardContent className="p-0 divide-y divide-zinc-800/50">
                {agentSessions.length === 0 ? (
                  <div className="px-5 py-12 text-center text-xs text-zinc-500">No sessions</div>
                ) : (
                  <>
                    {/* Sub-agents */}
                    {subagentSessions.length > 0 && (
                      <div className="px-5 py-2">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
                          Sub-agents & Cron Sessions ({subagentSessions.length})
                        </p>
                      </div>
                    )}
                    {subagentSessions.map((session) => (
                      <SessionRow key={session.id} session={session}
                        expanded={expandedSession === session.id}
                        onToggle={() => handleExpandSession(session.id)}
                        messages={expandedSession === session.id ? sessionMessages : []}
                        loading={expandedSession === session.id && sessionLoading}
                        renderContent={renderMessageContent} />
                    ))}
                    {mainSessions.length > 0 && subagentSessions.length > 0 && (
                      <div className="px-5 py-2">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
                          Main Sessions ({mainSessions.length})
                        </p>
                      </div>
                    )}
                    {mainSessions.map((session) => (
                      <SessionRow key={session.id} session={session}
                        expanded={expandedSession === session.id}
                        onToggle={() => handleExpandSession(session.id)}
                        messages={expandedSession === session.id ? sessionMessages : []}
                        loading={expandedSession === session.id && sessionLoading}
                        renderContent={renderMessageContent} />
                    ))}
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* ── Memory Tab ── */}
          {activeTab === "memory" && (
            <Card>
              <CardHeader>
                <h2 className="text-sm font-semibold">Memory Search</h2>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2 mb-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                    <input
                      type="text"
                      value={memoryQuery}
                      onChange={(e) => setMemoryQuery(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleMemorySearch()}
                      placeholder="Search agent memory (BM25 + semantic)..."
                      className="w-full rounded-lg border border-zinc-800 bg-zinc-900/50 py-2 pl-10 pr-4 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-zinc-600 focus:outline-none"
                    />
                  </div>
                  <Button variant="primary" icon={Search} loading={memorySearching}
                    onClick={handleMemorySearch}>Search</Button>
                </div>
                {memoryResults.length === 0 ? (
                  <div className="py-12 text-center text-xs text-zinc-500">
                    {memorySearching ? "Searching..." : "Search agent memories, decisions, and preferences"}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {memoryResults.map((mem) => (
                      <div key={mem.id} className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-3">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm text-zinc-200 whitespace-pre-wrap">{mem.content}</p>
                          {mem.relevance !== undefined && (
                            <span className="shrink-0 text-[10px] text-zinc-500">
                              {Math.round(mem.relevance * 100)}%
                            </span>
                          )}
                        </div>
                        <div className="mt-2 flex items-center gap-2 text-[10px] text-zinc-600">
                          <span className="rounded bg-zinc-800 px-1.5 py-0.5">{mem.type}</span>
                          <span>{formatRelativeTime(mem.createdAt)}</span>
                          {mem.source && <span>· {mem.source}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader><h2 className="text-sm font-semibold">Configuration</h2></CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div className="flex justify-between"><span className="text-zinc-500">Model</span><span className="font-mono text-zinc-300">{agent.model ?? "default"}</span></div>
              <div className="flex justify-between"><span className="text-zinc-500">Provider</span><span className="font-mono text-zinc-300">{agent.provider ?? "default"}</span></div>
              <div className="flex justify-between"><span className="text-zinc-500">Heartbeat</span><span className="font-mono text-zinc-300">{agent.heartbeatInterval ?? "30m"}</span></div>
              <div className="flex justify-between"><span className="text-zinc-500">Sandbox</span><span className="font-mono text-zinc-300">{agent.sandbox ? "Yes" : "No"}</span></div>
              {agent.channels && agent.channels.length > 0 && (
                <div className="flex justify-between"><span className="text-zinc-500">Channels</span><span className="font-mono text-zinc-300">{agent.channels.join(", ")}</span></div>
              )}
              {agent.tokenCount !== undefined && (
                <div className="flex justify-between"><span className="text-zinc-500">Tokens</span><span className="font-mono text-zinc-300">{agent.tokenCount.toLocaleString()}</span></div>
              )}
              {agent.tools && (
                <>
                  {agent.tools.allow && (
                    <div>
                      <span className="text-zinc-500">Allowed Tools</span>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {agent.tools.allow.map((t) => (
                          <span key={t} className="rounded bg-emerald-400/10 px-1.5 py-0.5 text-[10px] text-emerald-400">{t}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {agent.tools.deny && (
                    <div>
                      <span className="text-zinc-500">Denied Tools</span>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {agent.tools.deny.map((t) => (
                          <span key={t} className="rounded bg-red-400/10 px-1.5 py-0.5 text-[10px] text-red-400">{t}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Quick session summary */}
          <Card>
            <CardHeader><h2 className="text-sm font-semibold">Session Summary</h2></CardHeader>
            <CardContent className="space-y-2 text-xs">
              <div className="flex justify-between"><span className="text-zinc-500">Total</span><span className="text-zinc-300">{agentSessions.length}</span></div>
              <div className="flex justify-between"><span className="text-zinc-500">Active</span><span className="text-emerald-400">{agentSessions.filter(s => s.status === "active").length}</span></div>
              <div className="flex justify-between"><span className="text-zinc-500">Sub-agents</span><span className="text-zinc-300">{subagentSessions.length}</span></div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ── Session Row sub-component ──

import type { Session, ChatMessagePart } from "@/types/gateway";

function SessionRow({ session, expanded, onToggle, messages, loading, renderContent }: {
  session: Session;
  expanded: boolean;
  onToggle: () => void;
  messages: ChatMessage[];
  loading: boolean;
  renderContent: (c: string | ChatMessagePart[]) => string;
}) {
  const isSubagent = session.key?.includes(":subagent:") || session.key?.includes(":cron:");
  const lastActive = session.lastMessageAt ? new Date(session.lastMessageAt) : null;
  const isRecent = lastActive && (Date.now() - lastActive.getTime()) < 120000;

  return (
    <div>
      <button onClick={onToggle} className="w-full flex items-center gap-3 px-5 py-3 text-left hover:bg-zinc-800/20 transition-colors">
        {expanded ? <ChevronDown className="h-3.5 w-3.5 text-zinc-500 shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 text-zinc-500 shrink-0" />}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-xs font-medium text-zinc-300 truncate">{session.label || session.id}</p>
            {isRecent && <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />}
            <StatusBadge status={session.status} />
          </div>
          <div className="mt-0.5 flex items-center gap-2 text-[10px] text-zinc-600">
            <span>{session.messageCount} msgs</span>
            {session.model && <span>· {session.model}</span>}
            {session.tokenCount && <span>· {session.tokenCount.toLocaleString()} tokens</span>}
            {session.lastMessageAt && <span>· {formatRelativeTime(session.lastMessageAt)}</span>}
            {isSubagent && <span className="text-amber-400">· subagent</span>}
          </div>
        </div>
      </button>
      {expanded && (
        <div className="border-t border-zinc-800/30 bg-zinc-900/30 px-5 py-3">
          {loading ? (
            <ListSkeleton count={3} />
          ) : messages.length === 0 ? (
            <p className="text-xs text-zinc-600 py-4 text-center">No messages in this session</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {messages.map((msg) => (
                <div key={msg.id} className={cn(
                  "rounded-lg px-3 py-2 text-xs",
                  msg.role === "user" ? "bg-emerald-500/10 text-emerald-200" :
                  msg.role === "tool" ? "bg-blue-500/10 text-blue-200 font-mono" :
                  "bg-zinc-800/50 text-zinc-300"
                )}>
                  <span className="font-medium text-zinc-500 mr-1">{msg.role}:</span>
                  <span className="break-words">{renderContent(msg.content).slice(0, 300)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
