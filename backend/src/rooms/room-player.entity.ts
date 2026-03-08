import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
} from 'typeorm';

@Entity('room_players')
export class RoomPlayer {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'int' })
  roomId!: number;

  @Column({ type: 'int' })
  userId!: number;

  @Column({ type: 'varchar', length: 64 })
  playerName!: string;

  @Column({ type: 'int' })
  seatIndex!: number;

  @Column({ type: 'int', default: 1 })
  isConnected!: number;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  joinedAt!: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  lastSeenAt!: Date;
}
