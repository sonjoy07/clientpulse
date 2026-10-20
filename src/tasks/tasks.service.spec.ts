import { Test, TestingModule } from '@nestjs/testing';
import { TasksService } from './tasks.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { Role, TaskStatus, TaskPriority } from '@prisma/client';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator.js';

describe('TasksService', () => {
  let service: TasksService;
  let prisma: {
    project: { findFirst: jest.Mock };
    user: { findFirst: jest.Mock };
    projectMember: { findUnique: jest.Mock };
    milestone: { findFirst: jest.Mock };
    task: {
      create: jest.Mock;
      findFirst: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };

  const adminUser: AuthenticatedUser = {
    id: 'admin-uuid-1',
    name: 'Admin User',
    email: 'admin@acme.example.com',
    role: Role.ADMIN,
    organizationId: 'org-uuid-1',
  };

  const teamMemberUser: AuthenticatedUser = {
    id: 'member-uuid-1',
    name: 'Team Member',
    email: 'member@acme.example.com',
    role: Role.TEAM_MEMBER,
    organizationId: 'org-uuid-1',
  };

  const projectId = 'proj-uuid-1';

  beforeEach(async () => {
    prisma = {
      project: { findFirst: jest.fn() },
      user: { findFirst: jest.fn() },
      projectMember: { findUnique: jest.fn() },
      milestone: { findFirst: jest.fn() },
      task: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get<TasksService>(TasksService);
  });

  describe('create', () => {
    it('should throw NotFoundException if project not in organization', async () => {
      prisma.project.findFirst.mockResolvedValue(null);

      await expect(
        service.create(adminUser.organizationId, projectId, {
          title: 'New Task',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if assignee is not a member of the project', async () => {
      prisma.project.findFirst.mockResolvedValue({ id: projectId });
      prisma.user.findFirst.mockResolvedValue({ id: 'user-2' });
      prisma.projectMember.findUnique.mockResolvedValue(null); // not a member

      await expect(
        service.create(adminUser.organizationId, projectId, {
          title: 'New Task',
          assigneeId: 'user-2',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if milestone does not belong to project', async () => {
      prisma.project.findFirst.mockResolvedValue({ id: projectId });
      prisma.milestone.findFirst.mockResolvedValue(null);

      await expect(
        service.create(adminUser.organizationId, projectId, {
          title: 'New Task',
          milestoneId: 'invalid-ms',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create task successfully when valid', async () => {
      prisma.project.findFirst.mockResolvedValue({ id: projectId });
      prisma.user.findFirst.mockResolvedValue({ id: teamMemberUser.id });
      prisma.projectMember.findUnique.mockResolvedValue({
        id: 'pm-1',
        projectId,
        userId: teamMemberUser.id,
      });
      prisma.task.create.mockResolvedValue({
        id: 'task-1',
        projectId,
        title: 'New Task',
        description: null,
        status: TaskStatus.TODO,
        priority: TaskPriority.MEDIUM,
        milestoneId: null,
        assigneeId: teamMemberUser.id,
        dueDate: null,
        completedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.create(adminUser.organizationId, projectId, {
        title: 'New Task',
        assigneeId: teamMemberUser.id,
      });

      expect(result.success).toBe(true);
      expect(result.data.id).toBe('task-1');
    });
  });

  describe('update', () => {
    it('should throw ForbiddenException if TEAM_MEMBER attempts to update task assigned to someone else', async () => {
      prisma.project.findFirst.mockResolvedValue({ id: projectId });
      prisma.task.findFirst.mockResolvedValue({
        id: 'task-1',
        projectId,
        assigneeId: 'someone-else',
        status: TaskStatus.TODO,
      });

      await expect(
        service.update(teamMemberUser, projectId, 'task-1', {
          status: TaskStatus.IN_PROGRESS,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException if TEAM_MEMBER attempts to update priority or title', async () => {
      prisma.project.findFirst.mockResolvedValue({ id: projectId });
      prisma.task.findFirst.mockResolvedValue({
        id: 'task-1',
        projectId,
        assigneeId: teamMemberUser.id,
        status: TaskStatus.TODO,
      });

      await expect(
        service.update(teamMemberUser, projectId, 'task-1', {
          title: 'Changed title',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow TEAM_MEMBER to update status of their assigned task', async () => {
      prisma.project.findFirst.mockResolvedValue({ id: projectId });
      prisma.task.findFirst.mockResolvedValue({
        id: 'task-1',
        projectId,
        assigneeId: teamMemberUser.id,
        status: TaskStatus.TODO,
      });
      prisma.task.update.mockResolvedValue({
        id: 'task-1',
        projectId,
        assigneeId: teamMemberUser.id,
        status: TaskStatus.DONE,
      });

      const result = await service.update(teamMemberUser, projectId, 'task-1', {
        status: TaskStatus.DONE,
      });

      expect(result.success).toBe(true);
      expect(prisma.task.update).toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should throw ForbiddenException if TEAM_MEMBER attempts to delete task', async () => {
      await expect(
        service.remove(teamMemberUser, projectId, 'task-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow ADMIN to delete task', async () => {
      prisma.project.findFirst.mockResolvedValue({ id: projectId });
      prisma.task.findFirst.mockResolvedValue({ id: 'task-1', projectId });
      prisma.task.delete.mockResolvedValue({});

      const result = await service.remove(adminUser, projectId, 'task-1');
      expect(result.success).toBe(true);
      expect(prisma.task.delete).toHaveBeenCalled();
    });
  });

  describe('findAllOrganizationTasks', () => {
    it('should query organization tasks with pagination and filters', async () => {
      prisma.task.count.mockResolvedValue(1);
      prisma.task.findMany.mockResolvedValue([
        {
          id: 'task-1',
          projectId: 'proj-1',
          title: 'Organization Task',
          status: TaskStatus.TODO,
          priority: TaskPriority.HIGH,
        },
      ]);

      const result = await service.findAllOrganizationTasks(adminUser, {
        page: 1,
        limit: 10,
        status: TaskStatus.TODO,
      });

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(prisma.task.findMany).toHaveBeenCalled();
    });
  });

  describe('findMyTasks', () => {
    it('should query tasks assigned to current user', async () => {
      prisma.task.count.mockResolvedValue(1);
      prisma.task.findMany.mockResolvedValue([
        {
          id: 'task-1',
          projectId: 'proj-1',
          assigneeId: teamMemberUser.id,
          title: 'My Task',
          status: TaskStatus.IN_PROGRESS,
          priority: TaskPriority.MEDIUM,
        },
      ]);

      const result = await service.findMyTasks(teamMemberUser, {
        page: 1,
        limit: 10,
      });

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });
  });

  describe('updateDirect', () => {
    it('should throw NotFoundException if task does not exist in organization', async () => {
      prisma.task.findFirst.mockResolvedValue(null);

      await expect(
        service.updateDirect(adminUser, 'invalid-task', {
          status: TaskStatus.DONE,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should find task and delegate to update', async () => {
      prisma.task.findFirst.mockResolvedValue({
        id: 'task-1',
        projectId,
        assigneeId: adminUser.id,
        status: TaskStatus.TODO,
      });
      prisma.project.findFirst.mockResolvedValue({ id: projectId });
      prisma.task.update.mockResolvedValue({
        id: 'task-1',
        projectId,
        status: TaskStatus.DONE,
      });

      const result = await service.updateDirect(adminUser, 'task-1', {
        status: TaskStatus.DONE,
      });

      expect(result.success).toBe(true);
    });
  });
});
