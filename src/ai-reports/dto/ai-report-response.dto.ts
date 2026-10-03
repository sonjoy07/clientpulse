import { AIReportStatus } from '@prisma/client';

export class AiReportResponseDto {
  id!: string;
  reportId?: string;
  projectId!: string;
  periodStart!: Date;
  periodEnd!: Date;
  status!: AIReportStatus;
  summary!: string | null;
  highlights!: string[] | null;
  achievements!: string[] | null;
  concerns!: string[] | null;
  nextSteps!: string[] | null;
  model!: string | null;
  generatedAt!: Date | null;
  errorMessage!: string | null;
  message?: string;
  createdAt!: Date;
  updatedAt!: Date;
}
