/// <reference types="multer" />
import {
  Body,
  Controller,
  Get,
  Post,
  Request,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './jwt-auth.guard';

const avatarStorage = diskStorage({
  destination: './uploads/avatars',
  filename: (_req, file, cb) =>
    cb(null, `${Date.now()}${extname(file.originalname)}`),
});

const avatarFilter = (
  _req: any,
  file: Express.Multer.File,
  cb: (error: Error | null, acceptFile: boolean) => void,
) => {
  const allowed = ['image/jpeg', 'image/png', 'image/webp'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only jpeg, png, webp files are allowed'), false);
  }
};

@Controller()
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  @UseInterceptors(
    FileInterceptor('avatar', { storage: avatarStorage, fileFilter: avatarFilter }),
  )
  async register(
    @Body() dto: RegisterDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const data = await this.auth.register(dto, file?.filename);
    return { data };
  }

  @Post('login')
  async login(@Body() dto: LoginDto) {
    const data = await this.auth.login(dto);
    return { data };
  }

  @Post('logout')
  logout() {
    return { message: 'Logged out' };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@Request() req: any) {
    const user = await this.auth.me(req.user.id);
    return { data: user };
  }
}
