import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { EnrollmentsService } from './enrollments.service';
import { CreateEnrollmentDto } from './dto/create-enrollment.dto';

@Controller('enrollments')
@UseGuards(JwtAuthGuard)
export class EnrollmentsController {
  constructor(private readonly enrollments: EnrollmentsService) {}

  @Post()
  async create(@Body() dto: CreateEnrollmentDto, @Request() req: any) {
    const data = await this.enrollments.create(req.user.id, dto);
    return { data };
  }

  @Get()
  async findAll(@Request() req: any) {
    const data = await this.enrollments.findAllForUser(req.user.id);
    return { data };
  }

  @Patch(':id/complete')
  async complete(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    const data = await this.enrollments.complete(id, req.user.id);
    return { data };
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    const data = await this.enrollments.remove(id, req.user.id);
    return { data };
  }
}
