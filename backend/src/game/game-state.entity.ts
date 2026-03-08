import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  UpdateDateColumn,
} from 'typeorm';

@Entity('game_states')
export class GameStateEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'int', unique: true })
  roomId!: number;

  @Column({ type: 'text' })
  stateJson!: string;

  @Column({ type: 'int', default: 1 })
  version!: number;

  @UpdateDateColumn()
  updatedAt!: Date;
}
