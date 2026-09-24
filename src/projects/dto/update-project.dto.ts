import { Transform } from 'class-transformer';
import { IsEnum, IsISO8601, IsOptional, IsString } from 'class-validator';
import { ProjectStatus } from '@prisma/client';

export class UpdateProjectDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsOptional()
  @IsString({ message: 'name must be a string' })
  name?: string;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsOptional()
  @IsString({ message: 'description must be a string' })
  description?: string;

  @IsOptional()
  @IsEnum(ProjectStatus, {
    message: `status must be one of: ${Object.values(ProjectStatus).join(', ')}`,
  })
  status?: ProjectStatus;

  @IsOptional()
  @IsISO8601({}, { message: 'startDate must be a valid ISO 8601 date string' })
  startDate?: string;

  @IsOptional()
  @IsISO8601({}, { message: 'endDate must be a valid ISO 8601 date string' })
  endDate?: string;
}
