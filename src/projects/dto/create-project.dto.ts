import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { ProjectStatus } from '@prisma/client';

export class CreateProjectDto {
  @IsUUID('4', { message: 'clientId must be a valid UUID' })
  @IsNotEmpty({ message: 'clientId is required' })
  clientId!: string;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString({ message: 'name must be a string' })
  @IsNotEmpty({ message: 'name is required' })
  name!: string;

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
  @IsISO8601(
    {},
    {
      message:
        'startDate must be a valid ISO 8601 date string (e.g. YYYY-MM-DD)',
    },
  )
  startDate?: string;

  @IsOptional()
  @IsISO8601(
    {},
    {
      message: 'endDate must be a valid ISO 8601 date string (e.g. YYYY-MM-DD)',
    },
  )
  endDate?: string;
}
