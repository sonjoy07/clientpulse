import { Logger } from '@nestjs/common';
import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import { AIReportStatus } from '@prisma/client';
import { QUEUES } from '../../queues/queues.constants.js';
import type { GenerateAiReportJob } from '../../queues/interfaces/ai-report-job.interface.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AiReportSnapshotService } from '../services/ai-report-snapshot.service.js';
import { AiReportGeneratorService } from '../services/ai-report-generator.service.js';

@Processor(QUEUES.AI_REPORT)
export class AiReportProcessor extends WorkerHost {
  private readonly logger = new Logger(AiReportProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly snapshotService: AiReportSnapshotService,
    private readonly generatorService: AiReportGeneratorService,
  ) {
    super();
  }

  async process(job: Job<GenerateAiReportJob>): Promise<void> {
    const { reportId, projectId, organizationId, periodStart, periodEnd } =
      job.data;

    this.logger.log(
      `AI report job started: jobId=${job.id ?? 'unknown'}, reportId=${reportId}, projectId=${projectId}`,
    );

    // 1. Load AIReport from PostgreSQL
    const report = await this.prisma.aIReport.findUnique({
      where: { id: reportId },
    });

    if (!report) {
      this.logger.warn(
        `AI report record ${reportId} not found, skipping job processing`,
      );
      return;
    }

    // 2. Idempotency safety: If already completed, skip duplicate generation
    if (report.status === AIReportStatus.COMPLETED) {
      this.logger.log(
        `AI report ${reportId} is already COMPLETED. Skipping redundant generation.`,
      );
      return;
    }

    // 3. Update status to GENERATING
    await this.prisma.aIReport.update({
      where: { id: reportId },
      data: {
        status: AIReportStatus.GENERATING,
        errorMessage: null,
      },
    });

    try {
      // 4. Build fresh, sanitized project snapshot from PostgreSQL
      const snapshot = await this.snapshotService.buildSnapshot(
        organizationId,
        projectId,
        new Date(periodStart),
        new Date(periodEnd),
      );

      // 5. Generate and validate AI report output
      const generated = await this.generatorService.generate(snapshot);

      // 6. Save completed report to PostgreSQL
      await this.prisma.aIReport.update({
        where: { id: reportId },
        data: {
          status: AIReportStatus.COMPLETED,
          summary: generated.output.summary,
          highlights: generated.output.highlights,
          achievements: generated.output.achievements,
          concerns: generated.output.concerns,
          nextSteps: generated.output.nextSteps,
          model: generated.model,
          generatedAt: new Date(),
          errorMessage: null,
        },
      });

      this.logger.log(
        `AI report job completed: jobId=${job.id ?? 'unknown'}, reportId=${reportId}, projectId=${projectId}`,
      );
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);

      this.logger.error(
        `AI report job failed: jobId=${job.id ?? 'unknown'}, reportId=${reportId}, error=${errorMessage}`,
      );

      // If attempts are exhausted, mark report as FAILED in DB
      const maxAttempts = job.opts?.attempts ?? 3;
      if (job.attemptsMade + 1 >= maxAttempts) {
        await this.prisma.aIReport.update({
          where: { id: reportId },
          data: {
            status: AIReportStatus.FAILED,
            errorMessage,
          },
        });
      } else {
        this.logger.warn(
          `AI report retrying: jobId=${job.id ?? 'unknown'}, reportId=${reportId}, nextAttempt=${job.attemptsMade + 2}/${maxAttempts}`,
        );
      }

      throw err;
    }
  }

  @OnWorkerEvent('failed')
  async onFailed(job: Job<GenerateAiReportJob> | undefined, err: Error) {
    if (!job) return;
    const { reportId } = job.data;
    const maxAttempts = job.opts?.attempts ?? 3;
    if (job.attemptsMade >= maxAttempts) {
      try {
        await this.prisma.aIReport.update({
          where: { id: reportId },
          data: {
            status: AIReportStatus.FAILED,
            errorMessage: err.message,
          },
        });
        this.logger.warn(
          `AI report job permanently failed after ${job.attemptsMade} attempts: reportId=${reportId}`,
        );
      } catch (dbErr: unknown) {
        const msg = dbErr instanceof Error ? dbErr.message : String(dbErr);
        this.logger.error(
          `Failed to record permanent failure for reportId=${reportId}: ${msg}`,
        );
      }
    }
  }
}
