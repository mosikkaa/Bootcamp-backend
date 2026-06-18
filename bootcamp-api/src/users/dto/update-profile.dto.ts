import { IsInt, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  @Matches(/^[a-zA-Z\s]+$/, { message: 'full_name may only contain letters and spaces' })
  full_name?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{9,}$/, { message: 'mobile_number must be local digits (9+), e.g. 555123456' })
  mobile_number?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Transform(({ value }) => (value !== undefined && value !== '' ? Number(value) : undefined))
  age?: number;
}
