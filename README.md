# Хайдути — Card Game

A web application for playing **Хайдути**, the Bulgarian historical card game about the revolutionary movement of the 19th century. Supports both local pass-and-play on a single device and online multiplayer via WebSockets.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Tailwind CSS 4, Framer Motion, Wouter |
| Backend | Node.js, Express 4, tRPC 11 |
| Real-time | WebSocket (`ws` library) — game room channels |
| Database | MySQL / TiDB (via Drizzle ORM) |
| Auth | Manus OAuth (session cookie + JWT) |
| Build | Vite 7, esbuild, TypeScript 5.9 |
| Testing | Vitest |

---

## Prerequisites

- **Node.js** v22+ and **pnpm** v10+
- A **MySQL-compatible database** (MySQL 8, MariaDB, or TiDB)
- A **Manus OAuth application** (for user authentication) — or you can skip auth and use pass-and-play mode only

---

## Local Setup

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd haiduti-game
```

### 2. Install dependencies

```bash
pnpm install
```

### 3. Configure environment variables

Create a `.env` file in the project root with the following variables:

```env
# ── Required ──────────────────────────────────────────────────────────────────

# MySQL / TiDB connection string
DATABASE_URL="mysql://user:password@localhost:3306/haiduti"

# Secret used to sign session cookies (any long random string)
JWT_SECRET="your-random-secret-here"

# ── Manus OAuth (required for user login) ─────────────────────────────────────
# Register your app at https://manus.im to obtain these values.
# If you only want pass-and-play mode, you can leave these blank —
# the game will still work without authentication.

VITE_APP_ID=""
OAUTH_SERVER_URL="https://api.manus.im"
VITE_OAUTH_PORTAL_URL="https://manus.im"
OWNER_OPEN_ID=""
OWNER_NAME=""

# ── Optional (Manus built-in APIs) ────────────────────────────────────────────
BUILT_IN_FORGE_API_URL=""
BUILT_IN_FORGE_API_KEY=""
VITE_FRONTEND_FORGE_API_KEY=""
VITE_FRONTEND_FORGE_API_URL=""
```

### 4. Push the database schema

```bash
pnpm db:push
```

This runs `drizzle-kit generate && drizzle-kit migrate` and creates the following tables: `users`, `rooms`, `room_players`, `game_states`.

### 5. Start the development server

```bash
pnpm dev
```

The app will be available at **http://localhost:3000**. Both the Express API and the Vite dev server run on the same port through the built-in proxy.

---

## Available Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Start development server with hot reload |
| `pnpm build` | Build for production (outputs to `dist/`) |
| `pnpm start` | Run the production build |
| `pnpm test` | Run Vitest unit tests |
| `pnpm check` | TypeScript type-check without emitting |
| `pnpm db:push` | Generate and apply Drizzle migrations |
| `pnpm format` | Format all files with Prettier |

---

## Project Structure

```
client/
  src/
    pages/          ← Home, Setup, Game, Lobby, WaitingRoom, MultiplayerGame
    contexts/       ← WebSocketContext (real-time game state)
    lib/            ← gameData.ts (card definitions), gameEngine.ts (local reducer)
drizzle/
  schema.ts         ← Database tables (users, rooms, room_players, game_states)
server/
  _core/            ← Express + Vite bridge, OAuth, JWT, tRPC context
  db.ts             ← Drizzle query helpers
  routers.ts        ← tRPC root router
  roomRouter.ts     ← Room management procedures (create, join, leave, list)
  wsServer.ts       ← WebSocket server (room channels, game action dispatch)
shared/
  gameData.ts       ← Card types and definitions (shared by client and server)
  gameEngine.ts     ← Game state reducer (authoritative, runs server-side)
  const.ts          ← Shared constants
```

---

## Game Modes

**Pass-and-Play (local)** — No login required. Go to the home page, click "Нова игра", enter 2–6 player names, choose game length, and play on a single device by passing it between players.

**Multiplayer (online)** — Requires Manus OAuth login. Go to "Лоби", create a room or join one with a 6-character code. The host starts the game once all players have joined. Game state is managed server-side and broadcast to all players via WebSocket.

---

## Running Tests

```bash
pnpm test
```

Tests are located in `server/*.test.ts`. The test suite covers room creation, joining, leaving, capacity limits, and session restore logic.

---

## Production Build

```bash
pnpm build
pnpm start
```

The build step compiles the React frontend with Vite and bundles the Express server with esbuild. Both outputs land in `dist/`. The server serves the frontend as static files in production.

---

## Notes

- The WebSocket server attaches to the same HTTP server as Express at the path `/ws`. No separate port is needed.
- Session cookies are `httpOnly` and `SameSite=None; Secure` — HTTPS is required in production for cross-origin cookie handling.
- The Vite HMR WebSocket is configured to connect through a reverse proxy on port 443 (`hmr.clientPort: 443`). If you run locally without a proxy, remove the `hmr` block from `vite.config.ts`.
