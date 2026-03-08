import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class InitialSchema1709900000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'users',
        columns: [
          { name: 'id', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
          { name: 'email', type: 'varchar', length: '320', isNullable: false },
          { name: 'passwordHash', type: 'varchar', length: '255', isNullable: false },
          { name: 'name', type: 'varchar', length: '128', isNullable: true },
          { name: 'role', type: 'enum', enum: ['user', 'admin'], default: "'user'" },
          { name: 'createdAt', type: 'datetime', precision: 6, default: 'CURRENT_TIMESTAMP(6)' },
          { name: 'updatedAt', type: 'datetime', precision: 6, default: 'CURRENT_TIMESTAMP(6)', onUpdate: 'CURRENT_TIMESTAMP(6)' },
          { name: 'lastSignedIn', type: 'timestamp', isNullable: true },
        ],
      })
    );

    await queryRunner.createIndex('users', new TableIndex({ name: 'IDX_users_email', columnNames: ['email'], isUnique: true }));

    await queryRunner.createTable(
      new Table({
        name: 'rooms',
        columns: [
          { name: 'id', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
          { name: 'code', type: 'varchar', length: '8', isNullable: false },
          { name: 'name', type: 'varchar', length: '64', isNullable: false },
          { name: 'hostId', type: 'int', isNullable: false },
          { name: 'status', type: 'enum', enum: ['waiting', 'playing', 'finished'], default: "'waiting'" },
          { name: 'gameLength', type: 'enum', enum: ['short', 'medium', 'long'], default: "'medium'" },
          { name: 'maxPlayers', type: 'int', default: 4 },
          { name: 'createdAt', type: 'datetime', precision: 6, default: 'CURRENT_TIMESTAMP(6)' },
          { name: 'updatedAt', type: 'datetime', precision: 6, default: 'CURRENT_TIMESTAMP(6)', onUpdate: 'CURRENT_TIMESTAMP(6)' },
        ],
      })
    );

    await queryRunner.createIndex('rooms', new TableIndex({ name: 'IDX_rooms_code', columnNames: ['code'], isUnique: true }));

    await queryRunner.createTable(
      new Table({
        name: 'room_players',
        columns: [
          { name: 'id', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
          { name: 'roomId', type: 'int', isNullable: false },
          { name: 'userId', type: 'int', isNullable: false },
          { name: 'playerName', type: 'varchar', length: '64', isNullable: false },
          { name: 'seatIndex', type: 'int', isNullable: false },
          { name: 'isConnected', type: 'int', default: 1 },
          { name: 'joinedAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
          { name: 'lastSeenAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
        ],
      })
    );

    await queryRunner.createTable(
      new Table({
        name: 'game_states',
        columns: [
          { name: 'id', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
          { name: 'roomId', type: 'int', isNullable: false },
          { name: 'stateJson', type: 'text', isNullable: false },
          { name: 'version', type: 'int', default: 1 },
          { name: 'updatedAt', type: 'datetime', precision: 6, default: 'CURRENT_TIMESTAMP(6)', onUpdate: 'CURRENT_TIMESTAMP(6)' },
        ],
      })
    );

    await queryRunner.createIndex('game_states', new TableIndex({ name: 'IDX_game_states_roomId', columnNames: ['roomId'], isUnique: true }));
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('game_states', true);
    await queryRunner.dropTable('room_players', true);
    await queryRunner.dropTable('rooms', true);
    await queryRunner.dropTable('users', true);
  }
}
