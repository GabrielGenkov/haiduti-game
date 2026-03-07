import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure, publicProcedure } from "./_core/trpc";
import {
  createRoom, getRoomByCode, getRoomById, getRoomPlayers,
  getRoomPlayerByUserId, addPlayerToRoom, removePlayerFromRoom,
  listOpenRooms, findActiveRoomForUser
} from "./db";

export const roomRouter = router({
  /** List all open (waiting) rooms */
  list: publicProcedure.query(async () => {
    const rooms = await listOpenRooms();
    return rooms;
  }),

  /** Get a single room by code with its players */
  get: protectedProcedure
    .input(z.object({ code: z.string() }))
    .query(async ({ input }) => {
      const room = await getRoomByCode(input.code);
      if (!room) throw new TRPCError({ code: 'NOT_FOUND', message: 'Стаята не е намерена' });
      const players = await getRoomPlayers(room.id);
      return { room, players };
    }),

  /** Create a new room (authenticated) */
  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1).max(64),
      gameLength: z.enum(['short', 'medium', 'long']),
      maxPlayers: z.number().int().min(2).max(6),
    }))
    .mutation(async ({ ctx, input }) => {
      const room = await createRoom(ctx.user.id, input.name, input.gameLength, input.maxPlayers);
      // Host automatically joins as seat 0
      await addPlayerToRoom(room.id, ctx.user.id, ctx.user.name ?? 'Домакин', 0);
      const players = await getRoomPlayers(room.id);
      return { room, players };
    }),

  /** Join an existing room by code */
  join: protectedProcedure
    .input(z.object({
      code: z.string(),
      playerName: z.string().min(1).max(64).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const room = await getRoomByCode(input.code);
      if (!room) throw new TRPCError({ code: 'NOT_FOUND', message: 'Стаята не е намерена' });
      if (room.status !== 'waiting') throw new TRPCError({ code: 'BAD_REQUEST', message: 'Играта вече е започнала или приключила' });

      const players = await getRoomPlayers(room.id);
      const existing = players.find(p => p.userId === ctx.user.id);
      if (existing) {
        // Already in room — just return current state
        return { room, players };
      }

      if (players.length >= room.maxPlayers) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Стаята е пълна' });
      }

      const seatIndex = players.length;
      const name = input.playerName ?? ctx.user.name ?? 'Играч';
      await addPlayerToRoom(room.id, ctx.user.id, name, seatIndex);
      const updatedPlayers = await getRoomPlayers(room.id);
      return { room, players: updatedPlayers };
    }),

  /** Leave a room */
  leave: protectedProcedure
    .input(z.object({ roomId: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      await removePlayerFromRoom(input.roomId, ctx.user.id);
      return { success: true };
    }),

  /** Session restore: find the active room/game for the current user */
  myActiveRoom: protectedProcedure.query(async ({ ctx }) => {
    const result = await findActiveRoomForUser(ctx.user.id);
    if (!result) return null;
    const players = await getRoomPlayers(result.room.id);
    return { room: result.room, players, myPlayer: result.player };
  }),
});
