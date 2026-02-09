"use client";

import { useState } from "react";
import { useGateway } from "@/hooks/use-gateway";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import { FileCode, Save, RotateCcw, ArrowRight, Copy, Check } from "lucide-react";
import Link from "next/link";

export function ConfigViewer() {
  const { status, config, patchConfig } = useGateway();
  const [editMode, setEditMode] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (status !== "connected") {
    return (
      <EmptyState
        icon={FileCode}
        title="Not Connected"
        description="Connect to your gateway to view configuration."
        action={
          <Link href="/settings">
            <Button variant="primary" icon={ArrowRight}>Settings</Button>
          </Link>
        }
      />
    );
  }

  const configJson = config ? JSON.stringify(config, null, 2) : "{}";

  const handleEdit = () => {
    setEditContent(configJson);
    setEditMode(true);
    setError(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const parsed = JSON.parse(editContent);
      await patchConfig(parsed);
      setEditMode(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid JSON or save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(configJson);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Render config as a nice tree view
  const renderConfigTree = (obj: Record<string, unknown>, depth = 0): React.ReactNode => {
    return Object.entries(obj).map(([key, value]) => {
      const isObject = value && typeof value === "object" && !Array.isArray(value);
      const isArray = Array.isArray(value);

      return (
        <div key={key} style={{ marginLeft: depth * 16 }}>
          <div className="flex items-start gap-2 py-1">
            <span className="text-cyan-400 font-mono text-xs">{key}</span>
            <span className="text-zinc-600 text-xs">:</span>
            {isObject ? (
              <span className="text-zinc-600 text-xs">{"{"}</span>
            ) : isArray ? (
              <span className="text-zinc-600 text-xs">[</span>
            ) : typeof value === "string" ? (
              <span className="text-amber-300 font-mono text-xs">&quot;{value}&quot;</span>
            ) : typeof value === "boolean" ? (
              <span className={cn("font-mono text-xs", value ? "text-emerald-400" : "text-red-400")}>
                {String(value)}
              </span>
            ) : typeof value === "number" ? (
              <span className="text-violet-400 font-mono text-xs">{String(value)}</span>
            ) : (
              <span className="text-zinc-400 font-mono text-xs">{String(value)}</span>
            )}
          </div>
          {isObject ? (
            <>
              {renderConfigTree(value as Record<string, unknown>, depth + 1)}
              <div style={{ marginLeft: depth * 16 }}>
                <span className="text-zinc-600 text-xs">{"}"}</span>
              </div>
            </>
          ) : null}
          {isArray ? (
            <>
              {(value as unknown[]).map((item, i) => (
                <div key={i} style={{ marginLeft: (depth + 1) * 16 }} className="py-0.5">
                  {typeof item === "object" && item ? (
                    renderConfigTree(item as Record<string, unknown>, depth + 2)
                  ) : (
                    <span className="text-amber-300 font-mono text-xs">
                      {typeof item === "string" ? `"${item}"` : String(item)}
                    </span>
                  )}
                </div>
              ))}
              <div style={{ marginLeft: depth * 16 }}>
                <span className="text-zinc-600 text-xs">]</span>
              </div>
            </>
          ) : null}
        </div>
      );
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Configuration</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Review and edit your OpenClaw gateway configuration
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <FileCode className="h-4 w-4 text-cyan-400" />
            <h2 className="text-sm font-semibold">
              {editMode ? "Edit Configuration" : "Gateway Configuration"}
            </h2>
          </div>
          <div className="flex gap-2">
            {editMode ? (
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  icon={RotateCcw}
                  onClick={() => {
                    setEditMode(false);
                    setError(null);
                  }}
                >
                  Cancel
                </Button>
                <Button size="sm" variant="primary" icon={Save} loading={saving} onClick={handleSave}>
                  Save
                </Button>
              </>
            ) : (
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  icon={copied ? Check : Copy}
                  onClick={handleCopy}
                >
                  {copied ? "Copied" : "Copy"}
                </Button>
                <Button size="sm" variant="secondary" icon={FileCode} onClick={handleEdit}>
                  Edit
                </Button>
              </>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {error && (
            <div className="mx-5 mt-4 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400">
              {error}
            </div>
          )}
          {editMode ? (
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="min-h-[600px] w-full resize-y bg-transparent px-5 py-4 font-mono text-xs text-zinc-300 focus:outline-none"
              spellCheck={false}
            />
          ) : (
            <div className="max-h-[600px] overflow-auto px-5 py-4">
              {config ? renderConfigTree(config as unknown as Record<string, unknown>) : (
                <p className="text-xs text-zinc-500">No configuration loaded</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Reference Sections */}
      {config && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* Gateway Settings */}
          <Card>
            <CardHeader>
              <h3 className="text-sm font-semibold">Gateway Settings</h3>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-zinc-500">Port</span>
                <span className="font-mono text-zinc-300">
                  {(config.gateway as Record<string, unknown>)?.port as number ?? 18789}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Auth Mode</span>
                <span className="font-mono text-zinc-300">
                  {((config.gateway as Record<string, unknown>)?.auth as Record<string, unknown>)?.mode as string ?? "none"}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Agent Configs */}
          <Card>
            <CardHeader>
              <h3 className="text-sm font-semibold">
                Agents ({Object.keys(config.agents ?? {}).length})
              </h3>
            </CardHeader>
            <CardContent className="space-y-2 p-0">
              {Object.entries(config.agents ?? {}).map(([id, agentCfg]) => (
                <div key={id} className="flex items-center justify-between px-5 py-2">
                  <div>
                    <p className="text-xs font-medium text-zinc-300">
                      {agentCfg.emoji ?? "🤖"} {agentCfg.name ?? id}
                    </p>
                    <p className="text-[10px] font-mono text-zinc-600">{id}</p>
                  </div>
                  <span className="text-[10px] font-mono text-zinc-500">
                    {agentCfg.model ?? "default"}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
