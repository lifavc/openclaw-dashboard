# OpenClaw Mission Control

A command centre dashboard for managing your OpenClaw AI agent fleet. Connects directly to the OpenClaw Gateway via WebSocket (protocol v3) for real-time monitoring and control.

## Features

- **Agent Fleet Management** — View all agents with status, trigger or pause any agent, inspect agent files (Memory, Soul, Identity, Tools, Heartbeat)
- **Cron Job Control** — List, enable/disable, trigger, and remove cron jobs with human-readable schedule display
- **Task Board** — Kanban-style task management (Inbox > Up Next > In Progress > In Review > Done), assign to agents for pickup on next heartbeat
- **Calendar Timeline** — Visual calendar view of cron schedules and task deadlines, filterable by agent
- **Configuration Viewer** — Tree-view and raw JSON editor for gateway configuration with inline editing
- **Live Logs** — Real-time log stream with level and text filtering
- **Two-Way Sync** — Pause/resume agents, toggle cron jobs, and create tasks — all synced back to the gateway
- **Settings** — Configure gateway URL and auth token, stored in localStorage

## Quick Start

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
npm start
```

Open http://localhost:3000 and go to **Settings** to connect to your gateway.

## Docker (Coolify)

Deploy as a Docker container — optimized for Coolify with standalone Next.js output:

```bash
# Build and run
docker compose up -d

# Or build manually
docker build -t openclaw-dashboard .
docker run -p 3000:3000 openclaw-dashboard
```

### Coolify Setup

1. Create a new service in Coolify
2. Point to this repository
3. Select **Docker Compose** or **Dockerfile** as the build method
4. Set port to `3000`
5. Deploy

## Connecting to the Gateway

The dashboard connects via WebSocket to your OpenClaw Gateway (default: `ws://127.0.0.1:18789`).

### Local

No auth needed for loopback connections. Just enter the URL in Settings.

### Remote

For remote access, configure auth in `~/.openclaw/openclaw.json`:

```json
{
  "gateway": {
    "port": 18789,
    "bind": "0.0.0.0",
    "auth": {
      "mode": "token",
      "token": "your-secret-token"
    }
  }
}
```

Use Tailscale Serve, Cloudflare Tunnel, or SSH tunnel for secure access.

## Tech Stack

- **Next.js 16** with App Router
- **TypeScript**
- **Tailwind CSS v4**
- **Lucide Icons**
- **WebSocket** (OpenClaw Gateway Protocol v3)

## Gateway API

The dashboard uses these Gateway WebSocket methods:

| Method | Description |
|---|---|
| `config.get` / `config.patch` | Read/write gateway configuration |
| `agents.list` | List configured agents |
| `agents.files.get` / `agents.files.set` | Read/write agent workspace files |
| `sessions.list` | List active sessions |
| `cron.list` / `cron.run` / `cron.enable` / `cron.disable` | Manage cron jobs |
| `chat.send` / `chat.history` | Interact with agents |
| `logs.tail` | Real-time log streaming |
| `skills.list` | List discovered skills |
