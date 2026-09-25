import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class AddProjectMemberDto {
  @IsUUID('4', { message: 'userId must be a valid UUID' })
  @IsNotEmpty({ message: 'userId is required' })
  userId!: string;

  @IsOptional()
  @IsInt({ message: 'allocationPercentage must be an integer' })
  @Min(0, { message: 'allocationPercentage must be at least 0' })
  @Max(100, { message: 'allocationPercentage must be at most 100' })
  allocationPercentage: number = 100;
}
