# Хайдути — Card Game

A web application for playing **Хайдути**, a Bulgarian historical card game about the revolutionary movement of the 19th century. Supports both local pass-and-play on a single device and online multiplayer via WebSockets.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Tailwind CSS 4, Framer Motion, Wouter, esbuild |
| Backend | NestJS 10, TypeORM, Passport |
| Real-time | WebSocket (`ws` library) — game room channels |
| Database | MySQL 8 (via TypeORM) |
| Auth | Email/password (bcryptjs + JWT Bearer tokens) |
| Build | esbuild (frontend JS), Tailwind CLI (CSS), NestJS CLI (backend) |
| Testing | Vitest |

---

## Prerequisites

- **Node.js** v22+ and **npm** v10+
- **Docker** (for the database) — or a **MySQL-compatible database** (MySQL 8, MariaDB, or TiDB) running locally

---

## Project Structure

```
frontend/               ← React SPA (esbuild + Tailwind CLI)
  src/
    pages/              ← Home, Login, Register, Setup, Game, Lobby, WaitingRoom, MultiplayerGame
    components/ui/      ← shadcn/ui component library
    api/                ← Fetch-based REST client (auth, rooms)
    hooks/              ← useAuth (JWT from localStorage)
    contexts/           ← WebSocketContext, ThemeContext
  public/               ← Static assets, index.html
  esbuild.config.mjs    ← Production JS build
  dev-server.mjs        ← Dev server with proxy to backend

backend/                ← NestJS REST API + WebSocket gateway
  src/
    auth/               ← JWT strategy, login/register controller
    users/              ← User entity and service
    rooms/              ← Room CRUD, room-player management
    game/               ← Game state entity, service, WebSocket gateway
    database/           ← TypeORM module (MySQL connection)
    main.ts             ← Bootstrap (CORS, validation, WS adapter)
    app.module.ts       ← Root module

shared/                 ← Code shared by frontend and backend
  gameData.ts           ← Card types, definitions, trait IDs
  gameEngine.ts         ← Game state reducer (authoritative)
  api-types.ts          ← REST API request/response interfaces
  const.ts              ← Shared constants
```

---

## Local Setup

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd haiduti-game
```

### 2. Start the database

```bash
docker compose up -d
```

This starts a MySQL 8 container and automatically creates the `haiduti` database. The default credentials are `haiduti` / `haiduti` on port 3306.

### 3. Configure backend environment

Create a `.env` file in the `backend/` directory:

```env
# MySQL connection string (matches docker-compose defaults)
DATABASE_URL="mysql://haiduti:haiduti@localhost:3306/haiduti"

# Secret used to sign JWT tokens (any long random string)
JWT_SECRET="your-random-secret-here"

# Server port (default 3000)
PORT=3000
```

### 4. Install dependencies

```bash
# Backend
cd backend
npm install

# Frontend (in a separate terminal)
cd frontend
npm install
```

### 5. Start the backend

```bash
cd backend
npm run start:dev
```

The NestJS server starts on **http://localhost:3000** with file watching enabled. TypeORM `synchronize: false` — schema must already exist in the database.

### 6. Start the frontend

```bash
cd frontend
npm run dev
```

The dev server starts on **http://localhost:5173** and proxies `/api/*` and `/ws` requests to the backend at `localhost:3000`.

Open **http://localhost:5173** in your browser.

---

## Available Scripts

### Frontend (`frontend/`)

| Command | Description |
|---|---|
| `npm run dev` | Start dev server with esbuild watch + Tailwind watch + API proxy |
| `npm run build` | Production build: Tailwind CLI → `dist/bundle.css`, esbuild → `dist/bundle.js` |
| `npm run build:css` | Build CSS only (Tailwind CLI) |
| `npm run build:js` | Build JS only (esbuild) |

### Backend (`backend/`)

| Command | Description |
|---|---|
| `npm run start:dev` | Start NestJS in watch mode (hot reload) |
| `npm run start:debug` | Start with debug + watch mode |
| `npm run build` | Compile TypeScript via NestJS CLI |
| `npm run start:prod` | Run compiled production build (`dist/main.js`) |

---

## Authentication

The app uses **email/password** authentication with JWT Bearer tokens. Tokens are stored in `localStorage` and sent via the `Authorization: Bearer <token>` header.

| Endpoint | Method | Description |
|---|---|---|
| `/api/auth/register` | POST | Create account (email, password, name) → returns `{ token, user }` |
| `/api/auth/login` | POST | Authenticate → returns `{ token, user }` |
| `/api/auth/logout` | POST | No-op (client clears localStorage) |
| `/api/auth/me` | GET | Return current user from JWT (or 401) |

- Passwords hashed with **bcryptjs** (12 salt rounds)
- JWT signed with HS256, 7-day expiry
- No cookies — tokens passed explicitly by the client

---

## Game Modes

### Pass-and-Play (local)

No login required. Go to the home page, click "Нова игра", enter 2-6 player names, choose game length, and play on a single device by passing it between players. The game engine runs entirely client-side via a React `useReducer`.

### Multiplayer (online)

Requires email/password registration. Go to "Лоби", create a room or join one with a 6-character code. The host starts the game once 2+ players have joined. Game state is managed server-side (authoritative reducer) and broadcast to all players via WebSocket.

---

## Online Play — WebSocket Protocol

The WebSocket gateway runs on the same HTTP server at the `/ws` path.

### Client → Server

| Message Type | Payload | Purpose |
|---|---|---|
| `AUTH` | `{ token }` | Authenticate with JWT token |
| `JOIN_ROOM` | `{ roomCode }` | Join a room by 6-char code |
| `START_GAME` | `{}` | Host starts the game |
| `ACTION` | `{ payload: GameAction }` | Dispatch a game action |
| `PING` | `{}` | Keep-alive heartbeat |

### Server → Client

| Message Type | Payload | Purpose |
|---|---|---|
| `AUTH_OK` | `{ userId, name }` | Auth succeeded |
| `ROOM_STATE` | `{ room, players[], gameState? }` | Full room snapshot on join |
| `STATE_UPDATE` | `{ gameState, version }` | Game state changed (broadcast) |
| `PLAYER_JOINED` | `{ player }` | New player joined |
| `PLAYER_LEFT` | `{ userId, playerName }` | Player disconnected |
| `PLAYER_RECONNECTED` | `{ userId, playerName }` | Player reconnected |
| `GAME_STARTED` | `{ gameState }` | Game started by host |
| `GAME_OVER` | `{}` | Game finished |
| `ERROR` | `{ message }` | Error message |

### Room Lifecycle

`waiting` → `playing` → `finished`

1. Host creates room (name, game length, max players 2-6) → 6-char code generated
2. Players join by code → assigned sequential seat indices
3. Host sends `START_GAME` → server creates initial `GameState`, broadcasts `GAME_STARTED`
4. Players take turns sending `ACTION` → server validates turn order, applies action via reducer, broadcasts `STATE_UPDATE`
5. Game reaches scoring phase → room status set to `finished`

---

## Game Mechanics

### Card Types

| Type | Description |
|---|---|
| **Хайдут** (haydut) | Fighters with strength 2 or 3, in four colors |
| **Войвода** (voyvoda) | Leaders that can be raised for bonus points |
| **Деец** (deyets) | Revolutionary heroes with unique traits |
| **Заптие** (zaptie) | Ottoman police — reveal your committee or cause defeat |

### Player Stats

| Stat | Effect | Range |
|---|---|---|
| **Набор** (nabor) | Hand size limit | 4-10 |
| **Дейност** (deynost) | Actions per turn | 4-10 |
| **Бойна** (boyna) | Combat power vs Заптие | 4-10 |

### Turn Flow

`recruiting` → `selection` → `forming` → `end`

1. **Recruiting**: Scout field cards, safe/risky recruit, spend actions
2. **Selection**: Discard cards if over hand limit (or optionally discard extras)
3. **Forming**: Form groups of 3+ same-color cards to upgrade stats or raise Войводи/Дейци
4. **End**: Resolve end-of-turn trait effects, advance to next player

---

## Database Schema

| Table | Purpose |
|---|---|
| `users` | Registered accounts (email, passwordHash, name, role) |
| `rooms` | Game rooms (code, hostId, status, gameLength, maxPlayers) |
| `room_players` | Players in rooms (userId, seatIndex, isConnected) |
| `game_states` | Serialized game state per room (stateJson, version) |

---

## Production Build

```bash
# Build frontend
cd frontend
npm run build

# Build backend
cd backend
npm run build
```

Serve the frontend `dist/` directory with any static file server (nginx, caddy, etc.) and run the backend with `npm run start:prod`. Configure the frontend's API proxy to point to the backend host.
