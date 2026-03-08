import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Request,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { JwtAuthGuard } from './jwt-auth.guard';

class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsOptional()
  @IsString()
  name?: string;
}

class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  password!: string;
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new HttpException(
        'Email already registered',
        HttpStatus.CONFLICT,
      );
    }

    const passwordHash = await this.authService.hashPassword(dto.password);
    const user = await this.usersService.create({
      email: dto.email,
      passwordHash,
      name: dto.name ?? dto.email.split('@')[0],
    });

    await this.usersService.touchLastSignedIn(user.id);

    const token = this.authService.signToken({
      sub: String(user.id),
      email: user.email,
      name: user.name,
      role: user.role,
    });

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }

  @Post('login')
  async login(@Body() dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      throw new HttpException(
        'Invalid email or password',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const valid = await this.authService.verifyPassword(
      dto.password,
      user.passwordHash,
    );
    if (!valid) {
      throw new HttpException(
        'Invalid email or password',
        HttpStatus.UNAUTHORIZED,
      );
    }

    await this.usersService.touchLastSignedIn(user.id);

    const token = this.authService.signToken({
      sub: String(user.id),
      email: user.email,
      name: user.name,
      role: user.role,
    });

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }

  @Post('logout')
  async logout() {
    return { success: true };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@Request() req: any) {
    const user = req.user as {
      id: number;
      email: string;
      name: string;
      role: string;
    };
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };
  }
}
