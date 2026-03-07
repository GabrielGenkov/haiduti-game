import { and, eq, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { users, rooms, roomPlayers, gameStates, Room, RoomPlayer } from "../drizzle/schema";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── USER HELPERS ─────────────────────────────────────────────────────────────

/** Create a new user with an already-hashed password. */
export async function createUser(email: string, passwordHash: string, name: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(users).values({ email: email.toLowerCase(), passwordHash, name });
  const result = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1);
  return result[0];
}

/** Find a user by email (case-insensitive). */
export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

/** Find a user by their numeric id. */
export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

/** Update the lastSignedIn timestamp for a user. */
export async function touchLastSignedIn(userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ lastSignedIn: new Date() }).where(eq(users.id, userId));
}

// ─── ROOM HELPERS ─────────────────────────────────────────────────────────────

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

export async function createRoom(hostId: number, name: string, gameLength: 'short' | 'medium' | 'long', maxPlayers: number): Promise<Room> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  let code = generateRoomCode();
  for (let i = 0; i < 10; i++) {
    const existing = await db.select().from(rooms).where(eq(rooms.code, code)).limit(1);
    if (existing.length === 0) break;
    code = generateRoomCode();
  }
  await db.insert(rooms).values({ code, name, hostId, gameLength, maxPlayers, status: 'waiting' });
  const created = await db.select().from(rooms).where(eq(rooms.code, code)).limit(1);
  return created[0];
}

export async function getRoomByCode(code: string): Promise<Room | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(rooms).where(eq(rooms.code, code.toUpperCase())).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getRoomById(id: number): Promise<Room | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(rooms).where(eq(rooms.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function listOpenRooms(): Promise<Room[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(rooms).where(eq(rooms.status, 'waiting')).orderBy(desc(rooms.createdAt)).limit(20);
}

export async function updateRoomStatus(roomId: number, status: 'waiting' | 'playing' | 'finished'): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(rooms).set({ status }).where(eq(rooms.id, roomId));
}

// ─── ROOM PLAYER HELPERS ──────────────────────────────────────────────────────

export async function getRoomPlayers(roomId: number): Promise<RoomPlayer[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(roomPlayers).where(eq(roomPlayers.roomId, roomId)).orderBy(roomPlayers.seatIndex);
}

export async function getRoomPlayerByUserId(roomId: number, userId: number): Promise<RoomPlayer | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(roomPlayers)
    .where(and(eq(roomPlayers.roomId, roomId), eq(roomPlayers.userId, userId))).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function findActiveRoomForUser(userId: number): Promise<{ room: Room; player: RoomPlayer } | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const playerRows = await db.select().from(roomPlayers).where(eq(roomPlayers.userId, userId));
  for (const rp of playerRows) {
    const room = await getRoomById(rp.roomId);
    if (room && (room.status === 'waiting' || room.status === 'playing')) {
      return { room, player: rp };
    }
  }
  return undefined;
}

export async function addPlayerToRoom(roomId: number, userId: number, playerName: string, seatIndex: number): Promise<RoomPlayer> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(roomPlayers).values({ roomId, userId, playerName, seatIndex, isConnected: 1 });
  const result = await db.select().from(roomPlayers)
    .where(and(eq(roomPlayers.roomId, roomId), eq(roomPlayers.userId, userId))).limit(1);
  return result[0];
}

export async function removePlayerFromRoom(roomId: number, userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(roomPlayers).where(and(eq(roomPlayers.roomId, roomId), eq(roomPlayers.userId, userId)));
}

export async function updatePlayerConnection(roomId: number, userId: number, isConnected: boolean): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(roomPlayers)
    .set({ isConnected: isConnected ? 1 : 0, lastSeenAt: new Date() })
    .where(and(eq(roomPlayers.roomId, roomId), eq(roomPlayers.userId, userId)));
}

// ─── GAME STATE HELPERS ───────────────────────────────────────────────────────

export async function saveGameState(roomId: number, stateJson: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const existing = await db.select().from(gameStates).where(eq(gameStates.roomId, roomId)).limit(1);
  if (existing.length > 0) {
    await db.update(gameStates)
      .set({ stateJson, version: existing[0].version + 1 })
      .where(eq(gameStates.roomId, roomId));
  } else {
    await db.insert(gameStates).values({ roomId, stateJson, version: 1 });
  }
}

export async function loadGameState(roomId: number): Promise<{ stateJson: string; version: number } | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(gameStates).where(eq(gameStates.roomId, roomId)).limit(1);
  return result.length > 0 ? { stateJson: result[0].stateJson, version: result[0].version } : undefined;
}

export async function deleteGameState(roomId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(gameStates).where(eq(gameStates.roomId, roomId));
}
