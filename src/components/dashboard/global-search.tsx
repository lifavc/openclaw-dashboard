"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useGateway } from "@/hooks/use-gateway";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { SearchResult } from "@/types/gateway";
import {
  Search,
  ArrowRight,
  Bot,
  Brain,
  Clock,
  MessageSquare,
  FileCode,
  Loader2,
} from "lucide-react";
import Link from "next/link";

const TYPE_ICONS = {
  agent: Bot,
  memory: Brain,
  session: MessageSquare,
  cron: Clock,
  config: FileCode,
  file: FileCode,
} as const;

const TYPE_COLORS = {
  agent: "text-emerald-400 bg-emerald-400/10",
  memory: "text-violet-400 bg-violet-400/10",
  session: "text-cyan-400 bg-cyan-400/10",
  cron: "text-amber-400 bg-amber-400/10",
  config: "text-blue-400 bg-blue-400/10",
  file: "text-zinc-400 bg-zinc-400/10",
} as const;

export function GlobalSearch() {
  const { status, agents, sessions, cronJobs, config, searchMemory } = useGateway();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const performSearch = useCallback(async (q: string) => {
    if (!q.trim() || q.length < 2) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    setSearching(true);
    setHasSearched(true);
    const found: SearchResult[] = [];
    const lq = q.toLowerCase();

    // Search agents
    agents.forEach((agent) => {
      if (
        agent.name?.toLowerCase().includes(lq) ||
        agent.id.toLowerCase().includes(lq) ||
        agent.model?.toLowerCase().includes(lq)
      ) {
        found.push({
          type: "agent",
          title: `${agent.emoji ?? "🤖"} ${agent.name || agent.id}`,
          description: `${agent.model ?? "default"} · ${agent.status}`,
          id: agent.id,
          agentId: agent.id,
        });
      }
    });

    // Search sessions
    sessions.forEach((session) => {
      if (
        session.id.toLowerCase().includes(lq) ||
        session.label?.toLowerCase().includes(lq) ||
        session.key?.toLowerCase().includes(lq)
      ) {
        found.push({
          type: "session",
          title: session.label || session.id,
          description: `${session.status} · ${session.messageCount} messages · ${session.model ?? "default"}`,
          id: session.id,
          agentId: session.agentId,
        });
      }
    });

    // Search cron jobs
    cronJobs.forEach((job) => {
      if (
        job.id.toLowerCase().includes(lq) ||
        job.description?.toLowerCase().includes(lq) ||
        job.prompt?.toLowerCase().includes(lq) ||
        job.expression.includes(lq)
      ) {
        found.push({
          type: "cron",
          title: job.description || job.id,
          description: `${job.expression} · ${job.enabled ? "active" : "paused"}`,
          id: job.id,
          agentId: job.agentId,
        });
      }
    });

    // Search config keys
    if (config) {
      const searchConfig = (obj: Record<string, unknown>, path: string) => {
        for (const [key, value] of Object.entries(obj)) {
          const fullPath = path ? `${path}.${key}` : key;
          if (key.toLowerCase().includes(lq) || String(value).toLowerCase().includes(lq)) {
            found.push({
              type: "config",
              title: fullPath,
              description: typeof value === "object" ? "{...}" : String(value),
              excerpt: `${key}: ${JSON.stringify(value).slice(0, 100)}`,
            });
          }
          if (value && typeof value === "object" && !Array.isArray(value)) {
            searchConfig(value as Record<string, unknown>, fullPath);
          }
        }
      };
      searchConfig(config as unknown as Record<string, unknown>, "");
    }

    // Search memory for each agent
    for (const agent of agents) {
      try {
        const memories = await searchMemory(agent.id, q);
        memories.forEach((mem) => {
          found.push({
            type: "memory",
            title: `Memory: ${mem.content.slice(0, 80)}`,
            description: `${agent.emoji ?? "🤖"} ${agent.name || agent.id} · ${mem.type}`,
            excerpt: mem.content,
            agentId: agent.id,
            id: mem.id,
            relevance: mem.relevance,
          });
        });
      } catch {
        // memory search may not be available
      }
    }

    // Sort by relevance if available, otherwise type priority
    found.sort((a, b) => {
      if (a.relevance && b.relevance) return b.relevance - a.relevance;
      const order = ["agent", "memory", "session", "cron", "config", "file"];
      return order.indexOf(a.type) - order.indexOf(b.type);
    });

    setResults(found);
    setSearching(false);
  }, [agents, sessions, cronJobs, config, searchMemory]);

  const handleChange = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => performSearch(value), 300);
  };

  if (status !== "connected") {
    return (
      <EmptyState
        icon={Search}
        title="Not Connected"
        description="Connect to your gateway to search."
        action={
          <Link href="/settings">
            <Button variant="primary" icon={ArrowRight}>Settings</Button>
          </Link>
        }
      />
    );
  }

  // Group results by type
  const grouped = results.reduce<Record<string, SearchResult[]>>((acc, r) => {
    if (!acc[r.type]) acc[r.type] = [];
    acc[r.type].push(r);
    return acc;
  }, {});

  const typeLabels: Record<string, string> = {
    agent: "Agents",
    memory: "Memories",
    session: "Sessions",
    cron: "Cron Jobs",
    config: "Configuration",
    file: "Files",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Search</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Search across agents, memories, sessions, cron jobs, and configuration
        </p>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-500" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="Search everything..."
          className="w-full rounded-xl border border-zinc-700 bg-zinc-900/50 py-3.5 pl-12 pr-4 text-base text-zinc-200 placeholder:text-zinc-600 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
        />
        {searching && (
          <Loader2 className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 animate-spin text-zinc-500" />
        )}
      </div>

      {/* Results */}
      {!hasSearched ? (
        <div className="py-12 text-center text-sm text-zinc-500">
          Type at least 2 characters to search across your entire OpenClaw setup
        </div>
      ) : results.length === 0 && !searching ? (
        <EmptyState
          icon={Search}
          title="No results found"
          description={`No matches for "${query}". Try a different search term.`}
        />
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([type, items]) => {
            const Icon = TYPE_ICONS[type as keyof typeof TYPE_ICONS] ?? FileCode;
            const color = TYPE_COLORS[type as keyof typeof TYPE_COLORS] ?? TYPE_COLORS.file;

            return (
              <div key={type}>
                <div className="mb-2 flex items-center gap-2">
                  <div className={cn("rounded-md p-1", color)}>
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                    {typeLabels[type] ?? type} ({items.length})
                  </h3>
                </div>
                <div className="space-y-1">
                  {items.map((result, i) => (
                    <Card key={`${result.type}-${result.id ?? i}`} hover>
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            {result.type === "agent" && result.id ? (
                              <Link href={`/agents/${result.id}`}>
                                <p className="text-sm font-medium text-zinc-200 hover:text-emerald-400 transition-colors">
                                  {result.title}
                                </p>
                              </Link>
                            ) : (
                              <p className="text-sm font-medium text-zinc-200">{result.title}</p>
                            )}
                            {result.description && (
                              <p className="mt-0.5 text-xs text-zinc-500">{result.description}</p>
                            )}
                            {result.excerpt && (
                              <p className="mt-1 text-xs text-zinc-600 line-clamp-2 font-mono">
                                {result.excerpt}
                              </p>
                            )}
                          </div>
                          {result.relevance !== undefined && (
                            <span className="shrink-0 text-[10px] text-zinc-600">
                              {Math.round(result.relevance * 100)}%
                            </span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
