/// <reference types="multer" />
import {
  Body,
  Controller,
  Put,
  Request,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

const avatarStorage = diskStorage({
  destination: './uploads/avatars',
  filename: (_req, file, cb) =>
    cb(null, `${Date.now()}${extname(file.originalname)}`),
});

@Controller('profile')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Put()
  @UseInterceptors(FileInterceptor('avatar', { storage: avatarStorage }))
  async updateProfile(
    @Body() dto: UpdateProfileDto,
    @Request() req: any,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const data = await this.users.updateProfile(req.user.id, dto, file?.filename);
    return { data };
  }
}
