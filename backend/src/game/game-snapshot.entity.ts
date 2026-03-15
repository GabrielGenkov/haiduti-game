import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('game_snapshots')
export class GameSnapshotEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'int' })
  roomId!: number;

  @Column({ type: 'int' })
  revision!: number;

  @Column({ type: 'longtext' })
  stateJson!: string;

  @CreateDateColumn()
  createdAt!: Date;
}
