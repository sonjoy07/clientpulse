export class ClientAiReportResponseDto {
  id!: string;
  projectId!: string;
  periodStart!: Date;
  periodEnd!: Date;
  summary!: string | null;
  highlights!: string[] | null;
  achievements!: string[] | null;
  concerns!: string[] | null;
  nextSteps!: string[] | null;
  generatedAt!: Date | null;
  createdAt!: Date;
}
