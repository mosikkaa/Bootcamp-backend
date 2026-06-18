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
  list(@Query() query: any) {
    return this.courses.list(query);
  }

  @Get('courses/featured')
  featured() {
    return this.courses.featured();
  }

  @Get('courses/:id')
  @UseGuards(OptionalJwtAuthGuard)
  async findOne(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    const data = await this.courses.findOne(id, req.user?.id);
    return { data };
  }

  @Get('courses/:id/weekly-schedules')
  async weeklySchedules(@Param('id', ParseIntPipe) id: number) {
    const data = await this.courses.weeklySchedules(id);
    return { data };
  }

  @Get('courses/:id/time-slots')
  async timeSlots(
    @Param('id', ParseIntPipe) id: number,
    @Query('weekly_schedule_id') weeklyScheduleId: string,
  ) {
    const data = await this.courses.timeSlots(id, parseInt(weeklyScheduleId, 10));
    return { data };
  }

  @Get('courses/:id/session-types')
  async sessionTypes(
    @Param('id', ParseIntPipe) id: number,
    @Query('weekly_schedule_id') weeklyScheduleId: string,
    @Query('time_slot_id') timeSlotId: string,
  ) {
    const data = await this.courses.sessionTypes(
      id,
      parseInt(weeklyScheduleId, 10),
      parseInt(timeSlotId, 10),
    );
    return { data };
  }

  @Post('courses/:id/reviews')
  @UseGuards(JwtAuthGuard)
  async createReview(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateReviewDto,
    @Request() req: any,
  ) {
    return this.courses.createReview(id, req.user.id, dto);
  }
}
