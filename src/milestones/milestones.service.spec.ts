import { Test, TestingModule } from '@nestjs/testing';
import { MilestonesService } from './milestones.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { MilestoneStatus, TaskStatus } from '@prisma/client';

describe('MilestonesService', () => {
  let service: MilestonesService;
  let prisma: {
    project: { findFirst: jest.Mock };
    milestone: {
      create: jest.Mock;
      findFirst: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    task: {
      count: jest.Mock;
      groupBy: jest.Mock;
    };
  };

  const orgId = 'org-uuid-1';
  const projectId = 'proj-uuid-1';

  beforeEach(async () => {
    prisma = {
      project: { findFirst: jest.fn() },
      milestone: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      task: {
        count: jest.fn(),
        groupBy: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MilestonesService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get<MilestonesService>(MilestonesService);
  });

  describe('create', () => {
    it('should throw NotFoundException if project not in organization', async () => {
      prisma.project.findFirst.mockResolvedValue(null);

      await expect(
        service.create(orgId, projectId, { name: 'Milestone 1' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if startDate > dueDate', async () => {
      prisma.project.findFirst.mockResolvedValue({ id: projectId });

      await expect(
        service.create(orgId, projectId, {
          name: 'Milestone 1',
          startDate: '2026-10-25',
          dueDate: '2026-10-10',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should successfully create a milestone', async () => {
      prisma.project.findFirst.mockResolvedValue({ id: projectId });
      prisma.milestone.create.mockResolvedValue({
        id: 'ms-uuid-1',
        projectId,
        name: 'Milestone 1',
        description: null,
        status: MilestoneStatus.PENDING,
        startDate: null,
        dueDate: null,
        completedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.create(orgId, projectId, {
        name: 'Milestone 1',
      });
      expect(result.success).toBe(true);
      expect(result.data.id).toBe('ms-uuid-1');
      expect(result.data.progress).toBe(0);
    });
  });

  describe('findAll', () => {
    it('should throw NotFoundException if project not found', async () => {
      prisma.project.findFirst.mockResolvedValue(null);

      await expect(service.findAll(orgId, projectId, {})).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should calculate progress correctly based on task counts', async () => {
      prisma.project.findFirst.mockResolvedValue({ id: projectId });
      prisma.milestone.count.mockResolvedValue(1);
      prisma.milestone.findMany.mockResolvedValue([
        {
          id: 'ms-uuid-1',
          projectId,
          name: 'Milestone 1',
          description: null,
          status: MilestoneStatus.IN_PROGRESS,
          startDate: null,
          dueDate: null,
          completedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
      prisma.task.groupBy.mockResolvedValue([
        {
          milestoneId: 'ms-uuid-1',
          status: TaskStatus.DONE,
          _count: { _all: 3 },
        },
        {
          milestoneId: 'ms-uuid-1',
          status: TaskStatus.TODO,
          _count: { _all: 2 },
        },
      ]);

      const result = await service.findAll(orgId, projectId, {});
      expect(result.success).toBe(true);
      expect(result.data[0].taskCount).toBe(5);
      expect(result.data[0].completedTaskCount).toBe(3);
      expect(result.data[0].progress).toBe(60);
    });
  });

  describe('update', () => {
    it('should throw ConflictException if trying to complete with unfinished tasks', async () => {
      prisma.project.findFirst.mockResolvedValue({ id: projectId });
      prisma.milestone.findFirst.mockResolvedValue({
        id: 'ms-uuid-1',
        projectId,
        status: MilestoneStatus.IN_PROGRESS,
        startDate: null,
        dueDate: null,
        completedAt: null,
      });
      prisma.task.count.mockResolvedValue(2); // 2 unfinished tasks

      await expect(
        service.update(orgId, projectId, 'ms-uuid-1', {
          status: MilestoneStatus.COMPLETED,
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('remove', () => {
    it('should throw ConflictException if milestone has tasks', async () => {
      prisma.project.findFirst.mockResolvedValue({ id: projectId });
      prisma.milestone.findFirst.mockResolvedValue({
        id: 'ms-uuid-1',
        projectId,
      });
      prisma.task.count.mockResolvedValue(1);

      await expect(
        service.remove(orgId, projectId, 'ms-uuid-1'),
      ).rejects.toThrow(ConflictException);
    });

    it('should delete milestone if no tasks exist', async () => {
      prisma.project.findFirst.mockResolvedValue({ id: projectId });
      prisma.milestone.findFirst.mockResolvedValue({
        id: 'ms-uuid-1',
        projectId,
      });
      prisma.task.count.mockResolvedValue(0);
      prisma.milestone.delete.mockResolvedValue({});

      const result = await service.remove(orgId, projectId, 'ms-uuid-1');
      expect(result.success).toBe(true);
      expect(prisma.milestone.delete).toHaveBeenCalled();
    });
  });
});
