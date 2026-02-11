"use client";

import { useState, useEffect } from "react";
import { useGateway } from "@/hooks/use-gateway";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";
import {
  Settings2,
  Wifi,
  WifiOff,
  Plug,
  Unplug,
  CheckCircle2,
  AlertCircle,
  Info,
} from "lucide-react";

const SETTINGS_KEY = "openclaw-dashboard-settings";

const DEFAULT_URL = process.env.NEXT_PUBLIC_GATEWAY_URL ?? "ws://127.0.0.1:18789";
const DEFAULT_TOKEN = process.env.NEXT_PUBLIC_GATEWAY_TOKEN ?? "";

function loadSettings(): { url: string; token: string } {
  if (typeof window === "undefined") return { url: "", token: "" };
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { url: DEFAULT_URL, token: DEFAULT_TOKEN };
}

export function SettingsPage() {
  const { status, error, connect, disconnect } = useGateway();
  const [url, setUrl] = useState(DEFAULT_URL);
  const [token, setToken] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);

  useEffect(() => {
    const saved = loadSettings();
    if (saved.url) setUrl(saved.url);
    if (saved.token) setToken(saved.token);
  }, []);

  const handleConnect = async () => {
    setConnecting(true);
    setConnectError(null);
    try {
      await connect(url, token);
    } catch (err) {
      setConnectError(err instanceof Error ? err.message : "Connection failed");
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = () => {
    disconnect();
  };

  const isConnected = status === "connected";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Configure your gateway connection and dashboard preferences
        </p>
      </div>

      {/* Connection Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            {isConnected ? (
              <Wifi className="h-4 w-4 text-emerald-400" />
            ) : (
              <WifiOff className="h-4 w-4 text-zinc-500" />
            )}
            <h2 className="text-sm font-semibold">Gateway Connection</h2>
            <StatusBadge
              status={isConnected ? "online" : status === "connecting" ? "busy" : "offline"}
              label={status}
              pulse={isConnected}
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Connection Form */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                Gateway WebSocket URL
              </label>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder={DEFAULT_URL}
                disabled={isConnected}
                className={cn(
                  "w-full rounded-lg border bg-zinc-900/50 px-4 py-2.5 font-mono text-sm placeholder:text-zinc-600 focus:outline-none",
                  isConnected
                    ? "border-zinc-800 text-zinc-500"
                    : "border-zinc-700 text-zinc-200 focus:border-zinc-500"
                )}
              />
              <p className="mt-1 text-[10px] text-zinc-600">
                Default: {DEFAULT_URL} — Use wss:// for remote/secure connections
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                Authentication Token
              </label>
              <input
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Your gateway auth token"
                disabled={isConnected}
                className={cn(
                  "w-full rounded-lg border bg-zinc-900/50 px-4 py-2.5 font-mono text-sm placeholder:text-zinc-600 focus:outline-none",
                  isConnected
                    ? "border-zinc-800 text-zinc-500"
                    : "border-zinc-700 text-zinc-200 focus:border-zinc-500"
                )}
              />
              <p className="mt-1 text-[10px] text-zinc-600">
                Set via gateway.auth.mode in openclaw.json — required for non-loopback connections
              </p>
            </div>
          </div>

          {/* Error */}
          {(connectError || error) && (
            <div className="flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
              <div>
                <p className="text-xs font-medium text-red-400">Connection Error</p>
                <p className="text-[10px] text-red-400/70">{connectError || error}</p>
              </div>
            </div>
          )}

          {/* Success */}
          {isConnected && (
            <div className="flex items-start gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
              <div>
                <p className="text-xs font-medium text-emerald-400">Connected</p>
                <p className="text-[10px] text-emerald-400/70">
                  WebSocket connection to gateway is active. Data syncs every 15 seconds.
                </p>
              </div>
            </div>
          )}

          {/* Action */}
          <div className="flex gap-2">
            {isConnected ? (
              <Button variant="danger" icon={Unplug} onClick={handleDisconnect}>
                Disconnect
              </Button>
            ) : (
              <Button
                variant="primary"
                icon={Plug}
                loading={connecting}
                onClick={handleConnect}
              >
                Connect to Gateway
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Info Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-cyan-400" />
              <h3 className="text-sm font-semibold">Connection Guide</h3>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-xs text-zinc-400">
            <p>
              This dashboard connects directly to your OpenClaw Gateway via WebSocket
              (protocol v3). The gateway must be running for the dashboard to work.
            </p>
            <div className="space-y-1.5">
              <p className="font-medium text-zinc-300">Quick Start:</p>
              <div className="rounded-lg bg-zinc-800/50 p-3 font-mono text-[10px] text-zinc-300 space-y-1">
                <p className="text-zinc-500"># Start the gateway</p>
                <p>openclaw gateway start</p>
                <p className="text-zinc-500"># Check status</p>
                <p>openclaw gateway status</p>
                <p className="text-zinc-500"># Get health info</p>
                <p>openclaw gateway health</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Settings2 className="h-4 w-4 text-amber-400" />
              <h3 className="text-sm font-semibold">Remote Access</h3>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-xs text-zinc-400">
            <p>
              To access your gateway remotely (e.g., from this dashboard deployed on Coolify),
              you need to configure auth and expose the gateway.
            </p>
            <div className="space-y-1.5">
              <p className="font-medium text-zinc-300">In openclaw.json:</p>
              <div className="rounded-lg bg-zinc-800/50 p-3 font-mono text-[10px] text-zinc-300">
                <pre>{`{
  "gateway": {
    "port": 18789,
    "bind": "0.0.0.0",
    "auth": {
      "mode": "token",
      "token": "your-secret-token"
    }
  }
}`}</pre>
              </div>
            </div>
            <p className="text-amber-400/70">
              Use Tailscale Serve, Cloudflare Tunnel, or SSH tunnel for secure remote access.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
