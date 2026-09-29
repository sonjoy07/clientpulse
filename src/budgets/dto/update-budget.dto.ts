import {
  IsOptional,
  IsNumber,
  IsPositive,
  IsString,
  Length,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateBudgetDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  totalBudget?: number;

  @IsOptional()
  @IsString()
  @Length(3, 3, { message: 'Currency must be an ISO 3-letter code (e.g. USD)' })
  currency?: string;
}
