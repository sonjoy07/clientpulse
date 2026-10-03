import { IsISO8601, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';

export class GenerateAiReportDto {
  @IsNotEmpty()
  @IsISO8601()
  periodStart!: string;

  @IsNotEmpty()
  @IsISO8601()
  periodEnd!: string;

  @IsOptional()
  @IsBoolean()
  force?: boolean;
}
