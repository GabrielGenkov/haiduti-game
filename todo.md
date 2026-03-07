# Хайдути — Project TODO

## Multiplayer Backend
- [x] Database schema: rooms, room_players, game_states tables
- [x] Run pnpm db:push to sync schema
- [x] Room management tRPC procedures (create, join, leave, list, get, myActiveRoom)
- [x] WebSocket server (ws library, room channels, cookie-based auth)
- [x] WS message types: ACTION, STATE_UPDATE, ROOM_STATE, GAME_STARTED, PLAYER_JOINED, PLAYER_LEFT, ERROR
- [x] Server-side game engine (shared/gameEngine.ts, shared/gameData.ts)
- [x] Session persistence: myActiveRoom procedure for reconnection on login
- [x] Vitest tests for room procedures (12 tests passing)

## Client Auth & Lobby
- [x] Auth context (useAuth hook provided by scaffold, Manus OAuth)
- [x] Lobby page: list open rooms, create room, join room by code
- [x] WaitingRoom page: show players in room, start game button (host only)
- [x] Session restore: on app load, if in active game → rejoin via myActiveRoom
- [x] WebSocket context/hook (connect, send action, receive state)

## Client Game Board
- [x] MultiplayerGame page: WS-driven game board
- [x] Replace local useReducer in Game.tsx with WS dispatch (external state/dispatch props)
- [x] Handle WS state updates → update local game state
- [x] App.tsx routes: /lobby, /room/:code, /game/:code
- [x] Home page: Мултиплейър button added

## Completed (Previous)
- [x] Basic homepage layout with hero banner and card gallery
- [x] Card gallery (Хайдути/Войводи/Дейци/Заптие tabs)
- [x] Setup page (player count, game length)
- [x] Full local game engine (pass-and-play)
- [x] Дейци trait system (all 15 traits)
- [x] Card data corrected to match a.txt
- [x] Immediate field replenishment
- [x] Заптие flow fixes (risky recruit ends turn, non-defeat resumes)
- [x] 4×4 field grid with aside overflow
- [x] Васил Левски and Софроний silent ignore fix
- [x] web-db-user scaffold upgrade

## Pending / Next Steps
- [ ] End-to-end browser test of full multiplayer flow
- [ ] Любен Каравелов stat-choice prompt at raise time
- [ ] Бенковски +2 actions toast notification
- [ ] Deck/rotation indicator in game UI
- [ ] Responsive field layout for tablets/mobile

## Auth Replacement (Email + Password)
- [x] Audit all OAuth references in codebase
- [x] Add passwordHash column to users table, run db:push
- [x] Install bcryptjs
- [x] Create server/auth.ts (hashPassword, verifyPassword, signJWT, verifyJWT)
- [x] Create server/authRoutes.ts (/api/auth/register, /api/auth/login, /api/auth/logout, /api/auth/me)
- [x] Rewrite server/_core/context.ts to use JWT cookie (no OAuth/sdk)
- [x] Rewrite client useAuth hook to use fetch-based auth (no OAuth/tRPC)
- [x] Build Login.tsx and Register.tsx page components
- [x] Update App.tsx routing (add /login and /register routes)
- [x] Update Lobby.tsx and all pages that called getLoginUrl() or OAuth redirects
- [x] Stub out oauth.ts and sdk.ts authenticateRequest (no longer used)
- [x] Add auth.email.test.ts vitest tests (5 tests passing, 17 total)
