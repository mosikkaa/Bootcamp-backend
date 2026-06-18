import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { CoursesService } from './courses.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard';
import { CreateReviewDto } from './dto/create-review.dto';

@Controller()
export class CoursesController {
  constructor(private readonly courses: CoursesService) {}

  @Get('courses')
  async list(@Query() query: any) {
    const data = await this.courses.list(query);
    return { data };
  }

  @Get('courses/featured')
  async featured() {
    const data = await this.courses.featured();
    return { data };
  }

  @Get('courses/:id')
  @UseGuards(OptionalJwtAuthGuard)
  async findOne(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    const data = await this.courses.findOne(id, req.user?.id);
    return { data };
  }

  @Get('courses/:id/schedules')
  async schedules(@Param('id', ParseIntPipe) id: number) {
    const data = await this.courses.schedules(id);
    return { data };
  }

  @Post('courses/:id/reviews')
  @UseGuards(JwtAuthGuard)
  async createReview(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateReviewDto,
    @Request() req: any,
  ) {
    const data = await this.courses.createReview(id, req.user.id, dto);
    return { data };
  }
}
