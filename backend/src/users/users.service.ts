import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { email } });
  }

  async findById(id: number): Promise<User | null> {
    return this.userRepo.findOne({ where: { id } });
  }

  async create(data: {
    email: string;
    passwordHash: string;
    name: string;
  }): Promise<User> {
    const user = this.userRepo.create({
      email: data.email,
      passwordHash: data.passwordHash,
      name: data.name,
      role: 'user',
    });
    return this.userRepo.save(user);
  }

  async touchLastSignedIn(userId: number): Promise<void> {
    await this.userRepo.update(userId, { lastSignedIn: new Date() });
  }
}
