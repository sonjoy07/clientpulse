import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import {
  Role,
  ProjectStatus,
  MilestoneStatus,
  TaskStatus,
} from '@prisma/client';
import { ClientPortalService } from './client-portal.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ProjectsService } from '../projects/projects.service.js';
import { TimelineStatus } from '../projects/delivery-summary.types.js';
import { ClientDeliveryStatus } from './dto/client-project-response.dto.js';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator.js';

describe('ClientPortalService', () => {
  let service: ClientPortalService;
  let prisma: {
    client: { findFirst: jest.Mock };
    project: { findFirst: jest.Mock; findMany: jest.Mock; count: jest.Mock };
    task: { groupBy: jest.Mock };
    milestone: { groupBy: jest.Mock; findMany: jest.Mock };
    aIReport: { count: jest.Mock; findMany: jest.Mock; findFirst: jest.Mock };
  };
  let projectsService: {
    getDeliverySummary: jest.Mock;
  };

  const orgId = 'org-uuid-1';
  const clientId = 'client-uuid-1';

  const validClientUser: AuthenticatedUser = {
    id: 'user-client-1',
    name: 'Emma ClientRep',
    email: 'client@example.com',
    role: Role.CLIENT,
    organizationId: orgId,
    clientId,
  };

  const unassignedClientUser: AuthenticatedUser = {
    id: 'user-client-2',
    name: 'No Client Rep',
    email: 'noclient@example.com',
    role: Role.CLIENT,
    organizationId: orgId,
    clientId: null,
  };

  beforeEach(async () => {
    prisma = {
      client: { findFirst: jest.fn() },
      project: { findFirst: jest.fn(), findMany: jest.fn(), count: jest.fn() },
      task: { groupBy: jest.fn() },
      milestone: { groupBy: jest.fn(), findMany: jest.fn() },
      aIReport: { count: jest.fn(), findMany: jest.fn(), findFirst: jest.fn() },
    };

    projectsService = {
      getDeliverySummary: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClientPortalService,
        { provide: PrismaService, useValue: prisma },
        { provide: ProjectsService, useValue: projectsService },
      ],
    }).compile();

    service = module.get<ClientPortalService>(ClientPortalService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Client Association Validation', () => {
    it('should throw ForbiddenException if clientId is null or undefined', async () => {
      await expect(service.getDashboard(unassignedClientUser)).rejects.toThrow(
        ForbiddenException,
      );

      await expect(
        service.getProjects(unassignedClientUser, { page: 1, limit: 10 }),
      ).rejects.toThrow(ForbiddenException);

      await expect(
        service.getProject(unassignedClientUser, 'proj-1'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getDashboard', () => {
    it('should return client dashboard with sanitized project information', async () => {
      prisma.client.findFirst.mockResolvedValue({
        id: clientId,
        name: 'Acme Contact',
        companyName: 'Acme Corp',
      });

      prisma.project.findMany.mockResolvedValue([
        {
          id: 'proj-1',
          name: 'Project Alpha',
          description: 'Client Project Alpha',
          status: ProjectStatus.ACTIVE,
          startDate: new Date('2026-09-01T00:00:00.000Z'),
          endDate: new Date('2026-12-31T00:00:00.000Z'),
        },
      ]);

      prisma.task.groupBy.mockResolvedValue([
        { projectId: 'proj-1', status: TaskStatus.DONE, _count: { _all: 3 } },
        {
          projectId: 'proj-1',
          status: TaskStatus.IN_PROGRESS,
          _count: { _all: 1 },
        },
      ]);

      prisma.milestone.groupBy.mockResolvedValue([
        {
          projectId: 'proj-1',
          status: MilestoneStatus.COMPLETED,
          _count: { _all: 2 },
        },
        {
          projectId: 'proj-1',
          status: MilestoneStatus.IN_PROGRESS,
          _count: { _all: 1 },
        },
      ]);

      const result = await service.getDashboard(validClientUser);

      expect(result.success).toBe(true);
      expect(result.data.client.companyName).toBe('Acme Corp');
      expect(result.data.summary.totalProjects).toBe(1);
      expect(result.data.summary.activeProjects).toBe(1);
      expect(result.data.projects).toHaveLength(1);
      expect(result.data.projects[0].progress).toBe(75); // 3 done / 4 total
      expect(result.data.projects[0].milestones.completed).toBe(2);
    });
  });

  describe('getProject', () => {
    it('should throw NotFoundException if project does not belong to client', async () => {
      prisma.project.findFirst.mockResolvedValue(null);

      await expect(
        service.getProject(validClientUser, 'other-client-proj'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should return client-safe project details', async () => {
      prisma.project.findFirst.mockResolvedValue({
        id: 'proj-1',
        name: 'Alpha Project',
        description: 'Alpha description',
        status: ProjectStatus.ACTIVE,
        startDate: null,
        endDate: null,
      });

      prisma.task.groupBy.mockResolvedValue([
        { status: TaskStatus.DONE, _count: { _all: 5 } },
      ]);
      prisma.milestone.groupBy.mockResolvedValue([
        { status: MilestoneStatus.COMPLETED, _count: { _all: 2 } },
      ]);

      const result = await service.getProject(validClientUser, 'proj-1');

      expect(result.success).toBe(true);
      expect(result.data.id).toBe('proj-1');
      expect(result.data.progress).toBe(100);
      expect(result.data.milestones.completed).toBe(2);
    });
  });

  describe('getProjectProgress', () => {
    it('should return sanitized progress reusing delivery summary calculation', async () => {
      prisma.project.findFirst.mockResolvedValue({
        id: 'proj-1',
        name: 'Alpha Project',
        status: ProjectStatus.ACTIVE,
        startDate: new Date('2026-09-01'),
        endDate: new Date('2026-12-31'),
      });

      projectsService.getDeliverySummary.mockResolvedValue({
        success: true,
        data: {
          progress: 68,
          timeline: {
            status: TimelineStatus.ON_TRACK,
            expectedProgress: 70,
            actualProgress: 68,
          },
          milestones: {
            total: 5,
            completed: 3,
            inProgress: 1,
            blocked: 1,
          },
        },
      });

      const result = await service.getProjectProgress(
        validClientUser,
        'proj-1',
      );

      expect(result.success).toBe(true);
      expect(result.data.progress).toBe(68);
      expect(result.data.status).toBe(ClientDeliveryStatus.ON_TRACK);
      expect(result.data.milestones.completed).toBe(3);
    });
  });

  describe('getProjectMilestones', () => {
    it('should return client-safe milestone list without internal tasks', async () => {
      prisma.project.findFirst.mockResolvedValue({ id: 'proj-1' });

      prisma.milestone.findMany.mockResolvedValue([
        {
          id: 'm-1',
          name: 'Milestone 1',
          description: 'Desc 1',
          status: MilestoneStatus.IN_PROGRESS,
          startDate: null,
          dueDate: new Date('2026-11-01'),
          completedAt: null,
          tasks: [
            { status: TaskStatus.DONE },
            { status: TaskStatus.IN_PROGRESS },
          ],
        },
      ]);

      const result = await service.getProjectMilestones(
        validClientUser,
        'proj-1',
      );

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe('m-1');
      expect(result.data[0].progress).toBe(50); // 1 done / 2 tasks
    });
  });

  describe('getProjectDeliveryStatus', () => {
    it('should return simplified client delivery status and message', async () => {
      prisma.project.findFirst.mockResolvedValue({
        id: 'proj-1',
        name: 'Alpha Project',
        status: ProjectStatus.ACTIVE,
        startDate: null,
        endDate: null,
      });

      projectsService.getDeliverySummary.mockResolvedValue({
        success: true,
        data: {
          progress: 90,
          timeline: {
            status: TimelineStatus.ON_TRACK,
          },
        },
      });

      const result = await service.getProjectDeliveryStatus(
        validClientUser,
        'proj-1',
      );

      expect(result.success).toBe(true);
      expect(result.data.status).toBe(ClientDeliveryStatus.ON_TRACK);
      expect(result.data.message).toContain('currently on track');
    });
  });

  describe('getProjectReports', () => {
    it('should throw NotFoundException if project does not belong to client', async () => {
      prisma.project.findFirst.mockResolvedValue(null);

      await expect(
        service.getProjectReports(validClientUser, 'proj-other', {
          page: 1,
          limit: 10,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should return paginated completed reports for client project', async () => {
      prisma.project.findFirst.mockResolvedValue({ id: 'proj-1' });
      prisma.aIReport.count.mockResolvedValue(1);
      prisma.aIReport.findMany.mockResolvedValue([
        {
          id: 'rep-1',
          projectId: 'proj-1',
          periodStart: new Date('2026-03-01'),
          periodEnd: new Date('2026-03-07'),
          status: 'COMPLETED',
          summary: 'Client weekly summary',
          highlights: ['H1'],
          achievements: ['A1'],
          concerns: [],
          nextSteps: ['N1'],
          model: 'secret-model',
          errorMessage: null,
          generatedAt: new Date(),
          createdAt: new Date(),
        },
      ]);

      const res = await service.getProjectReports(validClientUser, 'proj-1', {
        page: 1,
        limit: 10,
      });

      expect(res.success).toBe(true);
      expect(res.data).toHaveLength(1);
      expect(res.data[0].summary).toBe('Client weekly summary');
      expect('model' in res.data[0]).toBe(false);
    });
  });

  describe('getProjectReportById', () => {
    it('should throw NotFoundException if project not found for client', async () => {
      prisma.project.findFirst.mockResolvedValue(null);

      await expect(
        service.getProjectReportById(validClientUser, 'proj-1', 'rep-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if report not found or not completed', async () => {
      prisma.project.findFirst.mockResolvedValue({ id: 'proj-1' });
      prisma.aIReport.findFirst.mockResolvedValue(null);

      await expect(
        service.getProjectReportById(validClientUser, 'proj-1', 'rep-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should return sanitized client report by id', async () => {
      prisma.project.findFirst.mockResolvedValue({ id: 'proj-1' });
      prisma.aIReport.findFirst.mockResolvedValue({
        id: 'rep-1',
        projectId: 'proj-1',
        periodStart: new Date('2026-03-01'),
        periodEnd: new Date('2026-03-07'),
        summary: 'Single report summary',
        highlights: ['H1'],
        achievements: ['A1'],
        concerns: [],
        nextSteps: ['N1'],
        model: 'internal-secret',
        generatedAt: new Date(),
        createdAt: new Date(),
      });

      const res = await service.getProjectReportById(
        validClientUser,
        'proj-1',
        'rep-1',
      );

      expect(res.success).toBe(true);
      expect(res.data.id).toBe('rep-1');
      expect(res.data.summary).toBe('Single report summary');
      expect('model' in res.data).toBe(false);
    });
  });
});
