import { Test, TestingModule } from '@nestjs/testing';
import { AIReportStatus } from '@prisma/client';
import { AiReportProcessor } from './ai-report.processor.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AiReportSnapshotService } from '../services/ai-report-snapshot.service.js';
import { AiReportGeneratorService } from '../services/ai-report-generator.service.js';
import type { Job } from 'bullmq';
import type { GenerateAiReportJob } from '../../queues/interfaces/ai-report-job.interface.js';

describe('AiReportProcessor', () => {
  let processor: AiReportProcessor;
  let prisma: {
    aIReport: {
      findUnique: jest.Mock;
      update: jest.Mock;
    };
  };
  let snapshotService: {
    buildSnapshot: jest.Mock;
  };
  let generatorService: {
    generate: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      aIReport: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };
    snapshotService = {
      buildSnapshot: jest.fn(),
    };
    generatorService = {
      generate: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiReportProcessor,
        { provide: PrismaService, useValue: prisma },
        { provide: AiReportSnapshotService, useValue: snapshotService },
        { provide: AiReportGeneratorService, useValue: generatorService },
      ],
    }).compile();

    processor = module.get<AiReportProcessor>(AiReportProcessor);
  });

  const mockJob = {
    id: 'job-1',
    data: {
      reportId: 'rep-1',
      projectId: 'proj-1',
      organizationId: 'org-1',
      periodStart: '2026-03-01T00:00:00.000Z',
      periodEnd: '2026-03-07T00:00:00.000Z',
    },
    opts: { attempts: 3 },
    attemptsMade: 0,
  } as unknown as Job<GenerateAiReportJob>;

  it('should skip processing if report record is not found', async () => {
    prisma.aIReport.findUnique.mockResolvedValue(null);

    await processor.process(mockJob);

    expect(snapshotService.buildSnapshot).not.toHaveBeenCalled();
    expect(generatorService.generate).not.toHaveBeenCalled();
  });

  it('should skip generation if report is already COMPLETED (idempotent)', async () => {
    prisma.aIReport.findUnique.mockResolvedValue({
      id: 'rep-1',
      status: AIReportStatus.COMPLETED,
    });

    await processor.process(mockJob);

    expect(snapshotService.buildSnapshot).not.toHaveBeenCalled();
    expect(generatorService.generate).not.toHaveBeenCalled();
    expect(prisma.aIReport.update).not.toHaveBeenCalled();
  });

  it('should generate report and save COMPLETED status to database', async () => {
    prisma.aIReport.findUnique.mockResolvedValue({
      id: 'rep-1',
      status: AIReportStatus.PENDING,
    });
    prisma.aIReport.update.mockResolvedValue({});

    snapshotService.buildSnapshot.mockResolvedValue({
      projectId: 'proj-1',
      projectName: 'Alpha Project',
    });

    generatorService.generate.mockResolvedValue({
      output: {
        summary: 'Progress is on track with 90% completion.',
        highlights: ['Shipped v1.2'],
        achievements: ['Completed backend testing'],
        concerns: ['None'],
        nextSteps: ['Prepare deployment'],
      },
      model: 'mock-llm-v1',
    });

    await processor.process(mockJob);

    // Should first transition to GENERATING
    expect(prisma.aIReport.update).toHaveBeenNthCalledWith(1, {
      where: { id: 'rep-1' },
      data: {
        status: AIReportStatus.GENERATING,
        errorMessage: null,
      },
    });

    // Should build snapshot and call generator
    expect(snapshotService.buildSnapshot).toHaveBeenCalledWith(
      'org-1',
      'proj-1',
      expect.any(Date),
      expect.any(Date),
    );
    expect(generatorService.generate).toHaveBeenCalled();

    // Should save COMPLETED
    const secondCall = prisma.aIReport.update.mock.calls[1] as [
      {
        where: { id: string };
        data: { status: AIReportStatus; summary: string; model: string };
      },
    ];
    expect(secondCall[0].where.id).toBe('rep-1');
    expect(secondCall[0].data.status).toBe(AIReportStatus.COMPLETED);
    expect(secondCall[0].data.summary).toBe(
      'Progress is on track with 90% completion.',
    );
    expect(secondCall[0].data.model).toBe('mock-llm-v1');
  });

  it('should mark report as FAILED when generator throws on final attempt', async () => {
    prisma.aIReport.findUnique.mockResolvedValue({
      id: 'rep-1',
      status: AIReportStatus.PENDING,
    });
    prisma.aIReport.update.mockResolvedValue({});
    snapshotService.buildSnapshot.mockResolvedValue({});
    generatorService.generate.mockRejectedValue(
      new Error('LLM rate limit reached'),
    );

    const finalAttemptJob = {
      ...mockJob,
      attemptsMade: 2, // 3rd attempt (attempts: 3)
    } as unknown as Job<GenerateAiReportJob>;

    await expect(processor.process(finalAttemptJob)).rejects.toThrow(
      'LLM rate limit reached',
    );

    expect(prisma.aIReport.update).toHaveBeenCalledWith({
      where: { id: 'rep-1' },
      data: {
        status: AIReportStatus.FAILED,
        errorMessage: 'LLM rate limit reached',
      },
    });
  });

  it('should update report to FAILED on onFailed worker event on max attempts', async () => {
    prisma.aIReport.update.mockResolvedValue({});

    const failedJob = {
      ...mockJob,
      attemptsMade: 3,
    } as unknown as Job<GenerateAiReportJob>;

    await processor.onFailed(failedJob, new Error('Permanent failure'));

    expect(prisma.aIReport.update).toHaveBeenCalledWith({
      where: { id: 'rep-1' },
      data: {
        status: AIReportStatus.FAILED,
        errorMessage: 'Permanent failure',
      },
    });
  });
});
