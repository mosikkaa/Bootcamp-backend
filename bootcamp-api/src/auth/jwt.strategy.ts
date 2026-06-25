import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly cache = new Map<number, number>();

  constructor(private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_SECRET!,
    });
  }

  async validate(payload: { sub: number }) {
    const now = Date.now();
    const expiry = this.cache.get(payload.sub);
    if (expiry && expiry > now) return { id: payload.sub };

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) {
      this.cache.delete(payload.sub);
      throw new UnauthorizedException('Session expired, please log in again');
    }

    this.cache.set(payload.sub, now + 30_000);
    return { id: user.id };
  }
}
