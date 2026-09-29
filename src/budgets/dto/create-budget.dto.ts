import {
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateBudgetDto {
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  totalBudget!: number;

  @IsOptional()
  @IsString()
  @Length(3, 3, { message: 'Currency must be an ISO 3-letter code (e.g. USD)' })
  currency?: string = 'USD';
}
