import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class EventStore1742000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // game_commands — command log for replay and idempotency
    await queryRunner.createTable(
      new Table({
        name: 'game_commands',
        columns: [
          { name: 'id', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
          { name: 'roomId', type: 'int', isNullable: false },
          { name: 'commandId', type: 'varchar', length: '36', isNullable: false },
          { name: 'revision', type: 'int', isNullable: false },
          { name: 'playerIndex', type: 'int', isNullable: false },
          { name: 'commandJson', type: 'text', isNullable: false },
          { name: 'createdAt', type: 'datetime', precision: 6, default: 'CURRENT_TIMESTAMP(6)' },
        ],
      }),
    );

    await queryRunner.createIndex('game_commands', new TableIndex({
      name: 'IDX_game_commands_commandId',
      columnNames: ['commandId'],
      isUnique: true,
    }));

    await queryRunner.createIndex('game_commands', new TableIndex({
      name: 'IDX_game_commands_roomId_revision',
      columnNames: ['roomId', 'revision'],
    }));

    // game_events — append-only event log
    await queryRunner.createTable(
      new Table({
        name: 'game_events',
        columns: [
          { name: 'id', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
          { name: 'roomId', type: 'int', isNullable: false },
          { name: 'revision', type: 'int', isNullable: false },
          { name: 'eventIndex', type: 'int', isNullable: false },
          { name: 'eventType', type: 'varchar', length: '64', isNullable: false },
          { name: 'playerIndex', type: 'int', isNullable: false },
          { name: 'eventJson', type: 'text', isNullable: false },
          { name: 'createdAt', type: 'datetime', precision: 6, default: 'CURRENT_TIMESTAMP(6)' },
        ],
      }),
    );

    await queryRunner.createIndex('game_events', new TableIndex({
      name: 'IDX_game_events_roomId_revision_eventIndex',
      columnNames: ['roomId', 'revision', 'eventIndex'],
      isUnique: true,
    }));

    await queryRunner.createIndex('game_events', new TableIndex({
      name: 'IDX_game_events_roomId_revision',
      columnNames: ['roomId', 'revision'],
    }));

    // game_snapshots — periodic state snapshots for fast reconstruction
    await queryRunner.createTable(
      new Table({
        name: 'game_snapshots',
        columns: [
          { name: 'id', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
          { name: 'roomId', type: 'int', isNullable: false },
          { name: 'revision', type: 'int', isNullable: false },
          { name: 'stateJson', type: 'longtext', isNullable: false },
          { name: 'createdAt', type: 'datetime', precision: 6, default: 'CURRENT_TIMESTAMP(6)' },
        ],
      }),
    );

    await queryRunner.createIndex('game_snapshots', new TableIndex({
      name: 'IDX_game_snapshots_roomId_revision',
      columnNames: ['roomId', 'revision'],
      isUnique: true,
    }));
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('game_snapshots', true);
    await queryRunner.dropTable('game_events', true);
    await queryRunner.dropTable('game_commands', true);
  }
}
