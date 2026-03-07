import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── GAME ROOMS ──────────────────────────────────────────────────────────────

/**
 * A game room that players can join before starting a game.
 * Status lifecycle: waiting → playing → finished
 */
export const rooms = mysqlTable("rooms", {
  id: int("id").autoincrement().primaryKey(),
  /** Short human-readable code players use to join (e.g. "WOLF42") */
  code: varchar("code", { length: 8 }).notNull().unique(),
  name: varchar("name", { length: 64 }).notNull(),
  /** User ID of the room creator (host) */
  hostId: int("hostId").notNull(),
  status: mysqlEnum("status", ["waiting", "playing", "finished"]).default("waiting").notNull(),
  /** Game length chosen by host */
  gameLength: mysqlEnum("gameLength", ["short", "medium", "long"]).default("medium").notNull(),
  /** Max players (2–6) */
  maxPlayers: int("maxPlayers").default(4).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Room = typeof rooms.$inferSelect;
export type InsertRoom = typeof rooms.$inferInsert;

// ─── ROOM PLAYERS ────────────────────────────────────────────────────────────

/**
 * Junction table: which users are in which rooms, and their in-room state.
 */
export const roomPlayers = mysqlTable("room_players", {
  id: int("id").autoincrement().primaryKey(),
  roomId: int("roomId").notNull(),
  userId: int("userId").notNull(),
  /** Display name inside the game (may differ from user.name) */
  playerName: varchar("playerName", { length: 64 }).notNull(),
  /** Order in which this player joined (used for turn order) */
  seatIndex: int("seatIndex").notNull(),
  /** Whether this player is currently connected via WebSocket */
  isConnected: int("isConnected").default(1).notNull(), // 1 = true, 0 = false
  joinedAt: timestamp("joinedAt").defaultNow().notNull(),
  lastSeenAt: timestamp("lastSeenAt").defaultNow().notNull(),
});

export type RoomPlayer = typeof roomPlayers.$inferSelect;
export type InsertRoomPlayer = typeof roomPlayers.$inferInsert;

// ─── GAME STATE ───────────────────────────────────────────────────────────────

/**
 * Stores the authoritative serialised GameState JSON for each active game.
 * One row per room (upserted when game starts or state changes).
 */
export const gameStates = mysqlTable("game_states", {
  id: int("id").autoincrement().primaryKey(),
  roomId: int("roomId").notNull().unique(),
  /** Full serialised GameState as JSON */
  stateJson: text("stateJson").notNull(),
  /** Incremented on every state change — clients use this to detect stale updates */
  version: int("version").default(0).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type GameStateRow = typeof gameStates.$inferSelect;
export type InsertGameState = typeof gameStates.$inferInsert;
