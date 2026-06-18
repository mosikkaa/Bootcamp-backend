import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { serializeUser } from '../common/serialize-user';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async updateProfile(userId: number, dto: UpdateProfileDto, avatarFilename?: string) {
    const data: any = { ...dto };
    if (avatarFilename) {
      data.avatar = `${process.env.APP_URL}/uploads/avatars/${avatarFilename}`;
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data,
    });
    return serializeUser(user);
  }
}
