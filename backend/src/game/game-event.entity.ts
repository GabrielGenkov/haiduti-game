import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('game_events')
export class GameEventEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'int' })
  roomId!: number;

  @Column({ type: 'int' })
  revision!: number;

  @Column({ type: 'int' })
  eventIndex!: number;

  @Column({ type: 'varchar', length: 64 })
  eventType!: string;

  @Column({ type: 'int' })
  playerIndex!: number;

  @Column({ type: 'text' })
  eventJson!: string;

  @CreateDateColumn()
  createdAt!: Date;
}
