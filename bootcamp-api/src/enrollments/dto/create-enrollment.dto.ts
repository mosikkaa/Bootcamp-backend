import { IsBoolean, IsInt, IsOptional, IsPositive } from 'class-validator';

export class CreateEnrollmentDto {
  @IsInt()
  @IsPositive()
  courseId: number;

  @IsInt()
  @IsPositive()
  courseScheduleId: number;

  @IsOptional()
  @IsBoolean()
  force?: boolean;
}
