import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { ProjectsService } from './projects.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ProjectStatus, MilestoneStatus, TaskStatus } from '@prisma/client';
import {
  calculateTimelineStatus,
  TimelineStatus,
} from './delivery-summary.types.js';

describe('ProjectsService', () => {
  let service: ProjectsService;
  let prisma: {
    client: { findFirst: jest.Mock };
    project: {
      create: jest.Mock;
      count: jest.Mock;
      findMany: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    task: {
      groupBy: jest.Mock;
    };
    milestone: {
      groupBy: jest.Mock;
    };
    $transaction: jest.Mock;
  };

  const orgId = 'org-uuid-1';
  const clientId = 'client-uuid-1';
  const projectId = 'project-uuid-1';

  beforeEach(async () => {
    prisma = {
      client: { findFirst: jest.fn() },
      project: {
        create: jest.fn(),
        count: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      task: {
        groupBy: jest.fn(),
      },
      milestone: {
        groupBy: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<ProjectsService>(ProjectsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should throw NotFoundException if client does not belong to organization', async () => {
      prisma.client.findFirst.mockResolvedValue(null);

      await expect(
        service.create(orgId, {
          clientId: 'wrong-client',
          name: 'Project 1',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if startDate > endDate', async () => {
      prisma.client.findFirst.mockResolvedValue({
        id: clientId,
        organizationId: orgId,
      });

      await expect(
        service.create(orgId, {
          clientId,
          name: 'Project 1',
          startDate: '2026-12-01',
          endDate: '2026-10-01',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create project with valid client and dates', async () => {
      prisma.client.findFirst.mockResolvedValue({
        id: clientId,
        organizationId: orgId,
      });
      prisma.project.create.mockResolvedValue({
        id: projectId,
        organizationId: orgId,
        clientId,
        name: 'Project 1',
        status: ProjectStatus.PLANNING,
      });

      const result = await service.create(orgId, {
        clientId,
        name: 'Project 1',
        startDate: '2026-10-01',
        endDate: '2026-12-01',
      });

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('id', projectId);
    });
  });

  describe('findOne', () => {
    it('should throw NotFoundException if project is not in current organization', async () => {
      prisma.project.findFirst.mockResolvedValue(null);

      await expect(service.findOne(orgId, 'wrong-project-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return project with client and counts', async () => {
      prisma.project.findFirst.mockResolvedValue({
        id: projectId,
        organizationId: orgId,
        name: 'Project 1',
        client: { id: clientId, companyName: 'Acme Corp' },
        _count: { projectMembers: 2, milestones: 3, tasks: 5 },
      });

      const result = await service.findOne(orgId, projectId);
      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('id', projectId);
    });
  });

  describe('update', () => {
    it('should throw BadRequestException if updated startDate is after existing endDate', async () => {
      prisma.project.findFirst.mockResolvedValue({
        id: projectId,
        organizationId: orgId,
        startDate: new Date('2026-10-01'),
        endDate: new Date('2026-11-01'),
      });

      await expect(
        service.update(orgId, projectId, {
          startDate: '2026-12-01',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('remove', () => {
    it('should throw ConflictException if project has active milestones or tasks', async () => {
      prisma.project.findFirst.mockResolvedValue({
        id: projectId,
        organizationId: orgId,
        _count: { milestones: 2, tasks: 1, projectMembers: 1 },
      });

      await expect(service.remove(orgId, projectId)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should delete project if no active milestones or tasks', async () => {
      prisma.project.findFirst.mockResolvedValue({
        id: projectId,
        organizationId: orgId,
        _count: { milestones: 0, tasks: 0, projectMembers: 1 },
      });
      prisma.project.delete.mockResolvedValue({});

      const result = await service.remove(orgId, projectId);
      expect(result.success).toBe(true);
      expect(prisma.project.delete).toHaveBeenCalledWith({
        where: { id: projectId },
      });
    });
  });

  describe('getDeliverySummary', () => {
    it('should throw NotFoundException if project not found', async () => {
      prisma.project.findFirst.mockResolvedValue(null);

      await expect(
        service.getDeliverySummary(orgId, projectId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should return aggregated delivery summary with progress and timeline', async () => {
      prisma.project.findFirst.mockResolvedValue({
        id: projectId,
        name: 'Delivery Project',
        status: ProjectStatus.ACTIVE,
        startDate: new Date('2026-10-01'),
        endDate: new Date('2026-10-31'),
      });

      prisma.task.groupBy.mockResolvedValue([
        { status: TaskStatus.DONE, _count: { _all: 14 } },
        { status: TaskStatus.TODO, _count: { _all: 3 } },
        { status: TaskStatus.IN_PROGRESS, _count: { _all: 2 } },
        { status: TaskStatus.BLOCKED, _count: { _all: 1 } },
      ]);

      prisma.milestone.groupBy.mockResolvedValue([
        { status: MilestoneStatus.COMPLETED, _count: { _all: 3 } },
        { status: MilestoneStatus.IN_PROGRESS, _count: { _all: 1 } },
        { status: MilestoneStatus.BLOCKED, _count: { _all: 1 } },
      ]);

      const result = await service.getDeliverySummary(orgId, projectId);
      expect(result.success).toBe(true);
      expect(result.data.progress).toBe(70); // 14 / 20 * 100 = 70%
      expect(result.data.tasks.total).toBe(20);
      expect(result.data.tasks.done).toBe(14);
      expect(result.data.milestones.total).toBe(5);
      expect(result.data.milestones.completed).toBe(3);
      expect(result.data.timeline.status).toBeDefined();
    });
  });

  describe('calculateTimelineStatus', () => {
    it('should return COMPLETED when project status is COMPLETED', () => {
      const result = calculateTimelineStatus(
        ProjectStatus.COMPLETED,
        new Date('2026-01-01'),
        new Date('2026-06-01'),
        100,
      );
      expect(result.status).toBe(TimelineStatus.COMPLETED);
      expect(result.expectedProgress).toBe(100);
    });

    it('should return NOT_STARTED when current date is before start date', () => {
      const futureStart = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
      const futureEnd = new Date(Date.now() + 50 * 24 * 60 * 60 * 1000);
      const result = calculateTimelineStatus(
        ProjectStatus.PLANNING,
        futureStart,
        futureEnd,
        0,
      );
      expect(result.status).toBe(TimelineStatus.NOT_STARTED);
      expect(result.expectedProgress).toBe(0);
    });

    it('should return ON_TRACK when actual progress >= expectedProgress - 10', () => {
      // 100 days total, 65 days elapsed -> expected = 65%
      const start = new Date(Date.now() - 65 * 24 * 60 * 60 * 1000);
      const end = new Date(Date.now() + 35 * 24 * 60 * 60 * 1000);
      const result = calculateTimelineStatus(
        ProjectStatus.ACTIVE,
        start,
        end,
        70, // 70 >= 65 - 10
      );
      expect(result.status).toBe(TimelineStatus.ON_TRACK);
      expect(result.expectedProgress).toBe(65);
    });

    it('should return AT_RISK when actual progress is between -10% and -25% of expected', () => {
      // Expected = 70%, Actual = 45% -> diff = -25%
      const start = new Date(Date.now() - 70 * 24 * 60 * 60 * 1000);
      const end = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      const result = calculateTimelineStatus(
        ProjectStatus.ACTIVE,
        start,
        end,
        45,
      );
      expect(result.status).toBe(TimelineStatus.AT_RISK);
      expect(result.expectedProgress).toBe(70);
    });

    it('should return CRITICAL when actual progress < expectedProgress - 25', () => {
      // Expected = 75%, Actual = 40% -> diff = -35%
      const start = new Date(Date.now() - 75 * 24 * 60 * 60 * 1000);
      const end = new Date(Date.now() + 25 * 24 * 60 * 60 * 1000);
      const result = calculateTimelineStatus(
        ProjectStatus.ACTIVE,
        start,
        end,
        40,
      );
      expect(result.status).toBe(TimelineStatus.CRITICAL);
      expect(result.expectedProgress).toBe(75);
    });

    it('should return 0 actual progress for zero-task project', () => {
      const start = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
      const end = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
      const result = calculateTimelineStatus(
        ProjectStatus.ACTIVE,
        start,
        end,
        0, // zero tasks done
      );
      expect(result.actualProgress).toBe(0);
      expect(result.expectedProgress).toBe(10);
      // 0 >= 10 - 10 = 0 -> ON_TRACK
      expect(result.status).toBe(TimelineStatus.ON_TRACK);
    });
  });
});
