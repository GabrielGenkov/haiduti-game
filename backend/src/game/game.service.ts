import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GameStateEntity } from './game-state.entity';
import type { GameState } from '../../../shared/gameData';

@Injectable()
export class GameService {
  /** In-memory cache of active game states keyed by roomId */
  private roomGameStates = new Map<number, GameState>();

  constructor(
    @InjectRepository(GameStateEntity)
    private readonly gameStateRepo: Repository<GameStateEntity>,
  ) {}

  getCachedState(roomId: number): GameState | undefined {
    return this.roomGameStates.get(roomId);
  }

  setCachedState(roomId: number, state: GameState): void {
    this.roomGameStates.set(roomId, state);
  }

  removeCachedState(roomId: number): void {
    this.roomGameStates.delete(roomId);
  }

  async loadFromDb(roomId: number): Promise<{ state: GameState; version: number } | null> {
    const entity = await this.gameStateRepo.findOne({ where: { roomId } });
    if (!entity) return null;
    const state = JSON.parse(entity.stateJson) as GameState;
    this.roomGameStates.set(roomId, state);
    return { state, version: entity.version };
  }

  async saveToDb(roomId: number, state: GameState, version: number): Promise<void> {
    const stateJson = JSON.stringify(state);
    const existing = await this.gameStateRepo.findOne({ where: { roomId } });
    if (existing) {
      existing.stateJson = stateJson;
      existing.version = version;
      await this.gameStateRepo.save(existing);
    } else {
      const entity = this.gameStateRepo.create({
        roomId,
        stateJson,
        version,
      });
      await this.gameStateRepo.save(entity);
    }
    this.roomGameStates.set(roomId, state);
  }

  async getVersion(roomId: number): Promise<number> {
    const entity = await this.gameStateRepo.findOne({ where: { roomId } });
    return entity?.version ?? 0;
  }
}
