import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ServiceUnavailableException,
  Logger,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import { Prisma, AIReportStatus, AIReport } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { QUEUES, JOBS } from '../queues/queues.constants.js';
import type { GenerateAiReportJob } from '../queues/interfaces/ai-report-job.interface.js';
import { GenerateAiReportDto } from './dto/generate-ai-report.dto.js';
import { AiReportQueryDto } from './dto/ai-report-query.dto.js';
import { AiReportResponseDto } from './dto/ai-report-response.dto.js';
import {
  PaginatedResponse,
  ApiResponse,
} from '../common/interfaces/paginated-response.interface.js';

@Injectable()
export class AiReportsService {
  private readonly logger = new Logger(AiReportsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(QUEUES.AI_REPORT)
    private readonly aiReportQueue: Queue<GenerateAiReportJob>,
  ) {}

  private mapToResponse(
    report: AIReport,
    message?: string,
  ): AiReportResponseDto {
    return {
      id: report.id,
      reportId: report.id,
      projectId: report.projectId,
      periodStart: report.periodStart,
      periodEnd: report.periodEnd,
      status: report.status,
      summary: report.summary,
      highlights: (report.highlights as string[] | null) ?? null,
      achievements: (report.achievements as string[] | null) ?? null,
      concerns: (report.concerns as string[] | null) ?? null,
      nextSteps: (report.nextSteps as string[] | null) ?? null,
      model: report.model,
      generatedAt: report.generatedAt,
      errorMessage: report.errorMessage,
      ...(message ? { message } : {}),
      createdAt: report.createdAt,
      updatedAt: report.updatedAt,
    };
  }

  async generateReport(
    organizationId: string,
    projectId: string,
    dto: GenerateAiReportDto,
  ): Promise<ApiResponse<AiReportResponseDto>> {
    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        organizationId,
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const periodStart = new Date(dto.periodStart);
    const periodEnd = new Date(dto.periodEnd);

    if (
      isNaN(periodStart.getTime()) ||
      isNaN(periodEnd.getTime()) ||
      periodStart > periodEnd
    ) {
      throw new BadRequestException(
        'periodStart must be before or equal to periodEnd',
      );
    }

    // Check for existing report for this exact period
    const existing = await this.prisma.aIReport.findUnique({
      where: {
        projectId_periodStart_periodEnd: {
          projectId,
          periodStart,
          periodEnd,
        },
      },
    });

    // Idempotency: If completed and not forced, return existing immediately
    if (
      existing &&
      existing.status === AIReportStatus.COMPLETED &&
      !dto.force
    ) {
      return {
        success: true,
        data: this.mapToResponse(existing),
      };
    }

    // If PENDING or GENERATING and not forced, return existing without enqueuing duplicate job
    if (
      existing &&
      (existing.status === AIReportStatus.PENDING ||
        existing.status === AIReportStatus.GENERATING) &&
      !dto.force
    ) {
      return {
        success: true,
        data: this.mapToResponse(
          existing,
          'Report generation already in progress',
        ),
      };
    }

    // Upsert / prepare record in PENDING status
    let reportRecord = existing;
    if (reportRecord) {
      reportRecord = await this.prisma.aIReport.update({
        where: { id: reportRecord.id },
        data: {
          status: AIReportStatus.PENDING,
          errorMessage: null,
          summary: null,
          highlights: Prisma.DbNull,
          achievements: Prisma.DbNull,
          concerns: Prisma.DbNull,
          nextSteps: Prisma.DbNull,
          model: null,
          generatedAt: null,
        },
      });
    } else {
      reportRecord = await this.prisma.aIReport.create({
        data: {
          projectId,
          periodStart,
          periodEnd,
          status: AIReportStatus.PENDING,
        },
      });
    }

    // Enqueue job to ai-report queue
    try {
      const jobId = `ai-report-${reportRecord.id}`;
      const existingJob = await this.aiReportQueue
        .getJob(jobId)
        .catch(() => null);
      if (existingJob) {
        await existingJob.remove().catch(() => {});
      }

      await this.aiReportQueue.add(
        JOBS.GENERATE_WEEKLY_REPORT,
        {
          reportId: reportRecord.id,
          projectId,
          organizationId,
          periodStart: dto.periodStart,
          periodEnd: dto.periodEnd,
        },
        {
          jobId,
          attempts: 3,
          backoff: { type: 'exponential', delay: 2000 },
          removeOnComplete: { count: 100 },
          removeOnFail: { count: 200 },
        },
      );

      this.logger.log(
        `AI report generation job enqueued: reportId=${reportRecord.id}, projectId=${projectId}`,
      );

      return {
        success: true,
        data: this.mapToResponse(reportRecord, 'Report generation queued'),
      };
    } catch (err: unknown) {
      this.logger.error(
        `Failed to enqueue AI report generation for project ${projectId}: ${err instanceof Error ? err.message : String(err)}`,
      );

      await this.prisma.aIReport.update({
        where: { id: reportRecord.id },
        data: {
          status: AIReportStatus.FAILED,
          errorMessage: 'Queue service unavailable',
        },
      });

      throw new ServiceUnavailableException(
        'Failed to queue report generation. Please try again later.',
      );
    }
  }

  async findAll(
    organizationId: string,
    projectId: string,
    query: AiReportQueryDto,
  ): Promise<PaginatedResponse<AiReportResponseDto>> {
    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        organizationId,
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 10));
    const skip = (page - 1) * limit;

    const where: Prisma.AIReportWhereInput = {
      projectId,
    };

    if (query.status) {
      where.status = query.status;
    }

    if (query.from) {
      where.periodStart = { gte: new Date(query.from) };
    }

    if (query.to) {
      where.periodEnd = { lte: new Date(query.to) };
    }

    const [total, reports] = await Promise.all([
      this.prisma.aIReport.count({ where }),
      this.prisma.aIReport.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      success: true,
      data: reports.map((r) => this.mapToResponse(r)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async findById(
    organizationId: string,
    projectId: string,
    reportId: string,
  ): Promise<ApiResponse<AiReportResponseDto>> {
    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        organizationId,
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const report = await this.prisma.aIReport.findFirst({
      where: {
        id: reportId,
        projectId,
      },
    });

    if (!report) {
      throw new NotFoundException('AI report not found');
    }

    return {
      success: true,
      data: this.mapToResponse(report),
    };
  }
}
