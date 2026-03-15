import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { GameStateEntity } from './game-state.entity';
import { GameCommandEntity } from './game-command.entity';
import { GameEventEntity } from './game-event.entity';
import { GameSnapshotEntity } from './game-snapshot.entity';
import type { GameState } from '../../../shared/gameData';
import type { Command } from '../../../shared/gameEngine';
import type { DomainEvent } from '../../../shared/types/event';

const SNAPSHOT_INTERVAL = 20;

function playerIdToIndex(playerId: string): number {
  return parseInt(playerId.replace('player_', ''), 10);
}

@Injectable()
export class EventStoreService {
  private readonly logger = new Logger(EventStoreService.name);

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(GameCommandEntity)
    private readonly commandRepo: Repository<GameCommandEntity>,
    @InjectRepository(GameEventEntity)
    private readonly eventRepo: Repository<GameEventEntity>,
    @InjectRepository(GameSnapshotEntity)
    private readonly snapshotRepo: Repository<GameSnapshotEntity>,
    @InjectRepository(GameStateEntity)
    private readonly gameStateRepo: Repository<GameStateEntity>,
  ) {}

  /** Check if a command has already been processed (idempotency). */
  async isCommandProcessed(commandId: string): Promise<boolean> {
    const count = await this.commandRepo.count({ where: { commandId } });
    return count > 0;
  }

  /**
   * Persist a successful command + its events + updated state in a single transaction.
   * Also takes a periodic snapshot for fast reconstruction.
   */
  async commitTurn(
    roomId: number,
    command: Command,
    events: DomainEvent[],
    newState: GameState,
    newRevision: number,
  ): Promise<void> {
    const stateJson = JSON.stringify(newState);
    const playerIndex = playerIdToIndex(command.playerId);

    await this.dataSource.transaction(async (manager) => {
      // 1. Insert command
      await manager.insert(GameCommandEntity, {
        roomId,
        commandId: command.commandId,
        revision: newRevision,
        playerIndex,
        commandJson: JSON.stringify(command),
      });

      // 2. Batch insert events
      if (events.length > 0) {
        await manager.insert(
          GameEventEntity,
          events.map((e) => ({
            roomId,
            revision: e.revision,
            eventIndex: e.index,
            eventType: e.type,
            playerIndex: e.playerIndex,
            eventJson: JSON.stringify(e),
          })),
        );
      }

      // 3. Upsert game_states (latest state row)
      const existing = await manager.findOne(GameStateEntity, { where: { roomId } });
      if (existing) {
        existing.stateJson = stateJson;
        existing.version = newRevision;
        await manager.save(GameStateEntity, existing);
      } else {
        await manager.insert(GameStateEntity, {
          roomId,
          stateJson,
          version: newRevision,
        });
      }

      // 4. Conditional snapshot
      if (newRevision % SNAPSHOT_INTERVAL === 0) {
        await manager.insert(GameSnapshotEntity, {
          roomId,
          revision: newRevision,
          stateJson,
        });
      }
    });
  }

  /**
   * Save the initial game state (revision 0) with a snapshot.
   * Called from handleStartGame — no command/events to log.
   */
  async saveInitialState(roomId: number, state: GameState): Promise<void> {
    const stateJson = JSON.stringify(state);
    const revision = state.revision ?? 0;

    await this.dataSource.transaction(async (manager) => {
      // Upsert game_states
      const existing = await manager.findOne(GameStateEntity, { where: { roomId } });
      if (existing) {
        existing.stateJson = stateJson;
        existing.version = revision;
        await manager.save(GameStateEntity, existing);
      } else {
        await manager.insert(GameStateEntity, {
          roomId,
          stateJson,
          version: revision,
        });
      }

      // Always snapshot the initial state
      await manager.insert(GameSnapshotEntity, {
        roomId,
        revision,
        stateJson,
      });
    });
  }

  /** Load commands since a given revision (for replay/reconstruction). */
  async getCommandsSince(roomId: number, fromRevision: number): Promise<Command[]> {
    const rows = await this.commandRepo.find({
      where: { roomId },
      order: { revision: 'ASC' },
    });
    return rows
      .filter((r) => r.revision > fromRevision)
      .map((r) => JSON.parse(r.commandJson) as Command);
  }

  /** Load events since a given revision (for client catch-up). */
  async getEventsSince(roomId: number, fromRevision: number): Promise<DomainEvent[]> {
    const rows = await this.eventRepo.find({
      where: { roomId },
      order: { revision: 'ASC', eventIndex: 'ASC' },
    });
    return rows
      .filter((r) => r.revision > fromRevision)
      .map((r) => JSON.parse(r.eventJson) as DomainEvent);
  }
}
