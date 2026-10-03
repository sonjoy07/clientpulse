import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { getQueueToken } from '@nestjs/bullmq';
import { AIReportStatus } from '@prisma/client';
import { AiReportsService } from './ai-reports.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { QUEUES, JOBS } from '../queues/queues.constants.js';

describe('AiReportsService', () => {
  let service: AiReportsService;
  let prisma: {
    project: { findFirst: jest.Mock };
    aIReport: {
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
  };
  let queue: {
    getJob: jest.Mock;
    add: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      project: {
        findFirst: jest.fn(),
      },
      aIReport: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    queue = {
      getJob: jest.fn().mockResolvedValue(null),
      add: jest.fn().mockResolvedValue({ id: 'ai-report-job-1' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiReportsService,
        { provide: PrismaService, useValue: prisma },
        { provide: getQueueToken(QUEUES.AI_REPORT), useValue: queue },
      ],
    }).compile();

    service = module.get<AiReportsService>(AiReportsService);
  });

  const mockOrgId = 'org-1';
  const mockProjectId = 'proj-1';

  describe('generateReport', () => {
    it('should throw NotFoundException if project not found in organization', async () => {
      prisma.project.findFirst.mockResolvedValue(null);

      await expect(
        service.generateReport(mockOrgId, mockProjectId, {
          periodStart: '2026-03-01T00:00:00.000Z',
          periodEnd: '2026-03-07T00:00:00.000Z',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if periodStart is after periodEnd', async () => {
      prisma.project.findFirst.mockResolvedValue({ id: mockProjectId });

      await expect(
        service.generateReport(mockOrgId, mockProjectId, {
          periodStart: '2026-03-10T00:00:00.000Z',
          periodEnd: '2026-03-01T00:00:00.000Z',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should return existing completed report immediately if already completed and not forced', async () => {
      prisma.project.findFirst.mockResolvedValue({ id: mockProjectId });
      prisma.aIReport.findUnique.mockResolvedValue({
        id: 'rep-existing',
        projectId: mockProjectId,
        periodStart: new Date('2026-03-01T00:00:00.000Z'),
        periodEnd: new Date('2026-03-07T00:00:00.000Z'),
        status: AIReportStatus.COMPLETED,
        summary: 'Existing report summary',
        highlights: ['Highlight 1'],
        achievements: ['Achievement 1'],
        concerns: [],
        nextSteps: ['Next step 1'],
        model: 'mock-llm-v1',
        generatedAt: new Date(),
        errorMessage: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await service.generateReport(mockOrgId, mockProjectId, {
        periodStart: '2026-03-01T00:00:00.000Z',
        periodEnd: '2026-03-07T00:00:00.000Z',
      });

      expect(res.success).toBe(true);
      expect(res.data.id).toBe('rep-existing');
      expect(res.data.status).toBe(AIReportStatus.COMPLETED);
      expect(queue.add).not.toHaveBeenCalled();
    });

    it('should return existing in-progress report without queuing duplicate job if status is PENDING', async () => {
      prisma.project.findFirst.mockResolvedValue({ id: mockProjectId });
      prisma.aIReport.findUnique.mockResolvedValue({
        id: 'rep-pending',
        projectId: mockProjectId,
        periodStart: new Date('2026-03-01T00:00:00.000Z'),
        periodEnd: new Date('2026-03-07T00:00:00.000Z'),
        status: AIReportStatus.PENDING,
        summary: null,
        highlights: null,
        achievements: null,
        concerns: null,
        nextSteps: null,
        model: null,
        generatedAt: null,
        errorMessage: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await service.generateReport(mockOrgId, mockProjectId, {
        periodStart: '2026-03-01T00:00:00.000Z',
        periodEnd: '2026-03-07T00:00:00.000Z',
      });

      expect(res.success).toBe(true);
      expect(res.data.id).toBe('rep-pending');
      expect(res.data.status).toBe(AIReportStatus.PENDING);
      expect(res.data.message).toBe('Report generation already in progress');
      expect(queue.add).not.toHaveBeenCalled();
    });

    it('should enqueue background job and return PENDING report if none exists', async () => {
      prisma.project.findFirst.mockResolvedValue({ id: mockProjectId });
      prisma.aIReport.findUnique.mockResolvedValue(null);
      prisma.aIReport.create.mockResolvedValue({
        id: 'rep-new',
        projectId: mockProjectId,
        periodStart: new Date('2026-03-01T00:00:00.000Z'),
        periodEnd: new Date('2026-03-07T00:00:00.000Z'),
        status: AIReportStatus.PENDING,
        summary: null,
        highlights: null,
        achievements: null,
        concerns: null,
        nextSteps: null,
        model: null,
        generatedAt: null,
        errorMessage: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await service.generateReport(mockOrgId, mockProjectId, {
        periodStart: '2026-03-01T00:00:00.000Z',
        periodEnd: '2026-03-07T00:00:00.000Z',
      });

      expect(res.success).toBe(true);
      expect(res.data.id).toBe('rep-new');
      expect(res.data.status).toBe(AIReportStatus.PENDING);
      expect(res.data.message).toBe('Report generation queued');
      expect(queue.add).toHaveBeenCalledWith(
        JOBS.GENERATE_WEEKLY_REPORT,
        {
          reportId: 'rep-new',
          projectId: mockProjectId,
          organizationId: mockOrgId,
          periodStart: '2026-03-01T00:00:00.000Z',
          periodEnd: '2026-03-07T00:00:00.000Z',
        },
        expect.objectContaining({
          jobId: 'ai-report-rep-new',
          attempts: 3,
        }),
      );
    });

    it('should re-enqueue and update record when forced', async () => {
      prisma.project.findFirst.mockResolvedValue({ id: mockProjectId });
      prisma.aIReport.findUnique.mockResolvedValue({
        id: 'rep-completed',
        projectId: mockProjectId,
        periodStart: new Date('2026-03-01T00:00:00.000Z'),
        periodEnd: new Date('2026-03-07T00:00:00.000Z'),
        status: AIReportStatus.COMPLETED,
        summary: 'Old summary',
      });
      prisma.aIReport.update.mockResolvedValue({
        id: 'rep-completed',
        projectId: mockProjectId,
        periodStart: new Date('2026-03-01T00:00:00.000Z'),
        periodEnd: new Date('2026-03-07T00:00:00.000Z'),
        status: AIReportStatus.PENDING,
        summary: null,
        highlights: null,
        achievements: null,
        concerns: null,
        nextSteps: null,
        model: null,
        generatedAt: null,
        errorMessage: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await service.generateReport(mockOrgId, mockProjectId, {
        periodStart: '2026-03-01T00:00:00.000Z',
        periodEnd: '2026-03-07T00:00:00.000Z',
        force: true,
      });

      expect(res.success).toBe(true);
      expect(res.data.status).toBe(AIReportStatus.PENDING);
      expect(prisma.aIReport.update).toHaveBeenCalled();
      expect(queue.add).toHaveBeenCalled();
    });

    it('should mark report as FAILED in database and throw ServiceUnavailableException if queue.add throws', async () => {
      prisma.project.findFirst.mockResolvedValue({ id: mockProjectId });
      prisma.aIReport.findUnique.mockResolvedValue(null);
      prisma.aIReport.create.mockResolvedValue({
        id: 'rep-fail',
        projectId: mockProjectId,
        periodStart: new Date('2026-03-01T00:00:00.000Z'),
        periodEnd: new Date('2026-03-07T00:00:00.000Z'),
        status: AIReportStatus.PENDING,
      });
      prisma.aIReport.update.mockResolvedValue({});

      queue.add.mockRejectedValue(new Error('Redis connection refused'));

      await expect(
        service.generateReport(mockOrgId, mockProjectId, {
          periodStart: '2026-03-01T00:00:00.000Z',
          periodEnd: '2026-03-07T00:00:00.000Z',
        }),
      ).rejects.toThrow(ServiceUnavailableException);

      expect(prisma.aIReport.update).toHaveBeenCalledWith({
        where: { id: 'rep-fail' },
        data: {
          status: AIReportStatus.FAILED,
          errorMessage: 'Queue service unavailable',
        },
      });
    });
  });

  describe('findAll', () => {
    it('should return paginated reports', async () => {
      prisma.project.findFirst.mockResolvedValue({ id: mockProjectId });
      prisma.aIReport.count.mockResolvedValue(1);
      prisma.aIReport.findMany.mockResolvedValue([
        {
          id: 'rep-1',
          projectId: mockProjectId,
          periodStart: new Date(),
          periodEnd: new Date(),
          status: AIReportStatus.COMPLETED,
          summary: 'Summary 1',
          highlights: ['H1'],
          achievements: ['A1'],
          concerns: [],
          nextSteps: ['N1'],
          model: 'mock-llm-v1',
          generatedAt: new Date(),
          errorMessage: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const res = await service.findAll(mockOrgId, mockProjectId, {
        page: 1,
        limit: 10,
      });

      expect(res.success).toBe(true);
      expect(res.data).toHaveLength(1);
      expect(res.meta.total).toBe(1);
    });
  });

  describe('findById', () => {
    it('should return report if found', async () => {
      prisma.project.findFirst.mockResolvedValue({ id: mockProjectId });
      prisma.aIReport.findFirst.mockResolvedValue({
        id: 'rep-1',
        projectId: mockProjectId,
        periodStart: new Date(),
        periodEnd: new Date(),
        status: AIReportStatus.COMPLETED,
        summary: 'Summary 1',
        highlights: ['H1'],
        achievements: ['A1'],
        concerns: [],
        nextSteps: ['N1'],
        model: 'mock-llm-v1',
        generatedAt: new Date(),
        errorMessage: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await service.findById(mockOrgId, mockProjectId, 'rep-1');

      expect(res.success).toBe(true);
      expect(res.data.id).toBe('rep-1');
    });

    it('should throw NotFoundException if report not found', async () => {
      prisma.project.findFirst.mockResolvedValue({ id: mockProjectId });
      prisma.aIReport.findFirst.mockResolvedValue(null);

      await expect(
        service.findById(mockOrgId, mockProjectId, 'rep-non-existent'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
