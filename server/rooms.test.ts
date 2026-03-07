/**
 * Tests for the room tRPC router procedures.
 * Uses mocked DB helpers to avoid real database connections.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import type { User } from "../drizzle/schema";

// ─── Mock DB helpers ───────────────────────────────────────────────────────────

vi.mock("./db", () => ({
  upsertUser: vi.fn(),
  getUserByOpenId: vi.fn(),
  createRoom: vi.fn(),
  getRoomByCode: vi.fn(),
  getRoomById: vi.fn(),
  getRoomPlayers: vi.fn(),
  getRoomPlayerByUserId: vi.fn(),
  addPlayerToRoom: vi.fn(),
  removePlayerFromRoom: vi.fn(),
  listOpenRooms: vi.fn(),
  findActiveRoomForUser: vi.fn(),
  updatePlayerConnection: vi.fn(),
  updateRoomStatus: vi.fn(),
  saveGameState: vi.fn(),
  loadGameState: vi.fn(),
}));

import * as db from "./db";

// ─── Helpers ───────────────────────────────────────────────────────────────────

const mockUser: User = {
  id: 1,
  openId: "test-open-id",
  name: "Тест Играч",
  email: "test@example.com",
  loginMethod: "email",
  role: "user",
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
};

function createAuthContext(): TrpcContext {
  return {
    user: mockUser,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

function createAnonContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

const mockRoom = {
  id: 1,
  code: "ABC123",
  name: "Тестова стая",
  hostId: 1,
  status: "waiting" as const,
  gameLength: "medium" as const,
  maxPlayers: 4,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockRoomPlayer = {
  id: 1,
  roomId: 1,
  userId: 1,
  playerName: "Тест Играч",
  seatIndex: 0,
  isConnected: 1 as 0 | 1,
  joinedAt: new Date(),
};

// ─── Tests ─────────────────────────────────────────────────────────────────────

describe("rooms.list", () => {
  it("returns open rooms for anonymous users", async () => {
    vi.mocked(db.listOpenRooms).mockResolvedValue([mockRoom]);
    const caller = appRouter.createCaller(createAnonContext());
    const result = await caller.rooms.list();
    expect(result).toHaveLength(1);
    expect(result[0]?.code).toBe("ABC123");
  });
});

describe("rooms.create", () => {
  beforeEach(() => {
    vi.mocked(db.createRoom).mockResolvedValue(mockRoom);
    vi.mocked(db.addPlayerToRoom).mockResolvedValue(mockRoomPlayer);
    vi.mocked(db.getRoomPlayers).mockResolvedValue([mockRoomPlayer]);
  });

  it("creates a room and adds the host as seat 0", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.rooms.create({
      name: "Тестова стая",
      gameLength: "medium",
      maxPlayers: 4,
    });
    expect(result.room.code).toBe("ABC123");
    expect(db.createRoom).toHaveBeenCalledWith(1, "Тестова стая", "medium", 4);
    expect(db.addPlayerToRoom).toHaveBeenCalledWith(1, 1, "Тест Играч", 0);
    expect(result.players).toHaveLength(1);
  });

  it("throws UNAUTHORIZED for anonymous users", async () => {
    const caller = appRouter.createCaller(createAnonContext());
    await expect(
      caller.rooms.create({ name: "Стая", gameLength: "short", maxPlayers: 2 })
    ).rejects.toThrow();
  });
});

describe("rooms.join", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(db.getRoomByCode).mockResolvedValue(mockRoom);
    vi.mocked(db.getRoomPlayers).mockResolvedValue([]);
    vi.mocked(db.addPlayerToRoom).mockResolvedValue(mockRoomPlayer);
  });

  it("joins an open room as a new player", async () => {
    vi.mocked(db.getRoomPlayers)
      .mockResolvedValueOnce([]) // first call: check existing
      .mockResolvedValueOnce([mockRoomPlayer]); // second call: after join

    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.rooms.join({ code: "ABC123" });
    expect(result.room.code).toBe("ABC123");
    expect(db.addPlayerToRoom).toHaveBeenCalled();
  });

  it("returns current state if already in room", async () => {
    // Player with same userId is already in the room
    vi.mocked(db.getRoomPlayers).mockResolvedValue([mockRoomPlayer]);
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.rooms.join({ code: "ABC123" });
    expect(result.players).toHaveLength(1);
    // addPlayerToRoom should NOT be called since user is already in the room
    expect(db.addPlayerToRoom).not.toHaveBeenCalled();
  });

  it("throws NOT_FOUND for unknown room code", async () => {
    vi.mocked(db.getRoomByCode).mockResolvedValue(undefined);
    const caller = appRouter.createCaller(createAuthContext());
    await expect(caller.rooms.join({ code: "XXXXX" })).rejects.toThrow("Стаята не е намерена");
  });

  it("throws BAD_REQUEST if room is full", async () => {
    const fullRoom = { ...mockRoom, maxPlayers: 1 };
    vi.mocked(db.getRoomByCode).mockResolvedValue(fullRoom);
    // Different userId so the player is NOT already in the room
    const otherPlayer = { ...mockRoomPlayer, userId: 99 };
    vi.mocked(db.getRoomPlayers).mockResolvedValue([otherPlayer]); // 1 player = full for maxPlayers:1
    const caller = appRouter.createCaller(createAuthContext());
    await expect(caller.rooms.join({ code: "ABC123" })).rejects.toThrow("Стаята е пълна");
  });
});

describe("rooms.get", () => {
  it("returns room and players by code", async () => {
    vi.mocked(db.getRoomByCode).mockResolvedValue(mockRoom);
    vi.mocked(db.getRoomPlayers).mockResolvedValue([mockRoomPlayer]);
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.rooms.get({ code: "ABC123" });
    expect(result.room.id).toBe(1);
    expect(result.players).toHaveLength(1);
  });

  it("throws NOT_FOUND for unknown code", async () => {
    vi.mocked(db.getRoomByCode).mockResolvedValue(undefined);
    const caller = appRouter.createCaller(createAuthContext());
    await expect(caller.rooms.get({ code: "XXXXX" })).rejects.toThrow("Стаята не е намерена");
  });
});

describe("rooms.myActiveRoom", () => {
  it("returns null when user has no active room", async () => {
    vi.mocked(db.findActiveRoomForUser).mockResolvedValue(null);
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.rooms.myActiveRoom();
    expect(result).toBeNull();
  });

  it("returns room and player info when active room exists", async () => {
    vi.mocked(db.findActiveRoomForUser).mockResolvedValue({
      room: mockRoom,
      player: mockRoomPlayer,
    });
    vi.mocked(db.getRoomPlayers).mockResolvedValue([mockRoomPlayer]);
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.rooms.myActiveRoom();
    expect(result?.room.code).toBe("ABC123");
    expect(result?.myPlayer.playerName).toBe("Тест Играч");
  });
});
