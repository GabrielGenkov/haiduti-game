import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('rooms')
export class Room {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 8, unique: true })
  code!: string;

  @Column({ type: 'varchar', length: 64 })
  name!: string;

  @Column({ type: 'int' })
  hostId!: number;

  @Column({
    type: 'enum',
    enum: ['waiting', 'playing', 'finished'],
    default: 'waiting',
  })
  status!: 'waiting' | 'playing' | 'finished';

  @Column({ type: 'enum', enum: ['short', 'medium', 'long'], default: 'medium' })
  gameLength!: 'short' | 'medium' | 'long';

  @Column({ type: 'int', default: 4 })
  maxPlayers!: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
