import {
  IsOptional,
  IsNumber,
  IsPositive,
  IsEnum,
  IsString,
  IsISO8601,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CostCategory } from '@prisma/client';

export class UpdateCostEntryDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  amount?: number;

  @IsOptional()
  @IsEnum(CostCategory)
  category?: CostCategory;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsISO8601()
  incurredAt?: string;
}
