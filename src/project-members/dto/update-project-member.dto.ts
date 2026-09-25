import { IsInt, IsNotEmpty, Max, Min } from 'class-validator';

export class UpdateProjectMemberDto {
  @IsNotEmpty({ message: 'allocationPercentage is required' })
  @IsInt({ message: 'allocationPercentage must be an integer' })
  @Min(0, { message: 'allocationPercentage must be at least 0' })
  @Max(100, { message: 'allocationPercentage must be at most 100' })
  allocationPercentage!: number;
}
