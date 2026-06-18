import { IsInt, IsPositive } from 'class-validator';

export class CreateEnrollmentDto {
  @IsInt()
  @IsPositive()
  courseId: number;

  @IsInt()
  @IsPositive()
  courseScheduleId: number;
}
