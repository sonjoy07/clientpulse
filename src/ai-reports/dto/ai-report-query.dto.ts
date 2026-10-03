import { IsEnum, IsISO8601, IsInt, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { AIReportStatus } from '@prisma/client';

export class AiReportQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;

  @IsOptional()
  @IsEnum(AIReportStatus)
  status?: AIReportStatus;

  @IsOptional()
  @IsISO8601()
  from?: string;

  @IsOptional()
  @IsISO8601()
  to?: string;
}
