import {
  IsOptional,
  IsString,
  IsEnum,
  IsISO8601,
  MaxLength,
} from 'class-validator';
import { MilestoneStatus } from '@prisma/client';

export class UpdateMilestoneDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsISO8601()
  startDate?: string;

  @IsOptional()
  @IsISO8601()
  dueDate?: string;

  @IsOptional()
  @IsEnum(MilestoneStatus)
  status?: MilestoneStatus;
}
