import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { serializeUser } from '../common/serialize-user';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto, avatarFilename?: string) {
    if (dto.password !== dto.password_confirmation) {
      throw new BadRequestException({
        message: 'Validation failed',
        errors: { password_confirmation: ['Passwords do not match'] },
      });
    }

    const existing = await this.prisma.user.findFirst({
      where: { OR: [{ email: dto.email }, { username: dto.username }] },
    });
    if (existing) {
      const field = existing.email === dto.email ? 'email' : 'username';
      throw new BadRequestException({
        message: 'Validation failed',
        errors: { [field]: [`${field} already taken`] },
      });
    }

    const password = await bcrypt.hash(dto.password, 10);
    const avatar = avatarFilename
      ? `${process.env.APP_URL}/uploads/avatars/${avatarFilename}`
      : null;

    const user = await this.prisma.user.create({
      data: { username: dto.username, email: dto.email, password, avatar },
    });

    const token = this.jwt.sign({ sub: user.id });
    return { token, user: serializeUser(user) };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user || !(await bcrypt.compare(dto.password, user.password))) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const token = this.jwt.sign({ sub: user.id });
    return { token, user: serializeUser(user) };
  }

  async me(userId: number) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });
    return serializeUser(user);
  }
}
