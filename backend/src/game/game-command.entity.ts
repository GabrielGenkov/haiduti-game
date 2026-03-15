import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('game_commands')
export class GameCommandEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'int' })
  roomId!: number;

  @Column({ type: 'varchar', length: 36, unique: true })
  commandId!: string;

  @Column({ type: 'int' })
  revision!: number;

  @Column({ type: 'int' })
  playerIndex!: number;

  @Column({ type: 'text' })
  commandJson!: string;

  @CreateDateColumn()
  createdAt!: Date;
}
