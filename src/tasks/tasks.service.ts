import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateTaskDto } from './dto/create-task.dto.js';
import { UpdateTaskDto } from './dto/update-task.dto.js';
import { ListTaskQueryDto } from './dto/list-task-query.dto.js';
import {
  PaginatedResponse,
  ApiResponse,
} from '../common/interfaces/paginated-response.interface.js';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator.js';
import { Role, TaskStatus, TaskPriority, Prisma } from '@prisma/client';

export interface TaskResponseItem {
  id: string;
  projectId: string;
  milestoneId: string | null;
  assigneeId: string | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  assignee?: {
    id: string;
    name: string;
    email: string;
    role: Role;
  } | null;
  milestone?: {
    id: string;
    name: string;
    status: string;
  } | null;
  project?: {
    id: string;
    name: string;
    status: string;
  };
}

@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    organizationId: string,
    projectId: string,
    dto: CreateTaskDto,
  ): Promise<ApiResponse<TaskResponseItem>> {
    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        organizationId,
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (dto.assigneeId) {
      await this.validateAssigneeMembership(
        organizationId,
        projectId,
        dto.assigneeId,
      );
    }

    if (dto.milestoneId) {
      await this.validateMilestoneInProject(projectId, dto.milestoneId);
    }

    const task = await this.prisma.task.create({
      data: {
        projectId,
        title: dto.title.trim(),
        description: dto.description?.trim() || null,
        status: dto.status ?? TaskStatus.TODO,
        priority: dto.priority ?? TaskPriority.MEDIUM,
        milestoneId: dto.milestoneId || null,
        assigneeId: dto.assigneeId || null,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        completedAt: dto.status === TaskStatus.DONE ? new Date() : null,
      },
      include: {
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        milestone: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
      },
    });

    return {
      success: true,
      data: task,
    };
  }

  async findAll(
    organizationId: string,
    projectId: string,
    query: ListTaskQueryDto,
  ): Promise<PaginatedResponse<TaskResponseItem>> {
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

    const where: Prisma.TaskWhereInput = {
      projectId,
    };

    if (query.status) {
      where.status = query.status;
    }

    if (query.priority) {
      where.priority = query.priority;
    }

    if (query.milestoneId) {
      where.milestoneId = query.milestoneId;
    }

    if (query.assigneeId) {
      where.assigneeId = query.assigneeId;
    }

    if (query.dueDate) {
      const d = new Date(query.dueDate);
      const startOfDay = new Date(d);
      startOfDay.setUTCHours(0, 0, 0, 0);
      const endOfDay = new Date(d);
      endOfDay.setUTCHours(23, 59, 59, 999);
      where.dueDate = {
        gte: startOfDay,
        lte: endOfDay,
      };
    }

    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [total, items] = await Promise.all([
      this.prisma.task.count({ where }),
      this.prisma.task.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          assignee: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
          milestone: {
            select: {
              id: true,
              name: true,
              status: true,
            },
          },
        },
      }),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      success: true,
      data: items,
      meta: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  async findOne(
    organizationId: string,
    projectId: string,
    taskId: string,
  ): Promise<ApiResponse<TaskResponseItem>> {
    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        organizationId,
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const task = await this.prisma.task.findFirst({
      where: {
        id: taskId,
        projectId,
      },
      include: {
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        milestone: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
        project: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
      },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    return {
      success: true,
      data: task,
    };
  }

  async update(
    currentUser: AuthenticatedUser,
    projectId: string,
    taskId: string,
    dto: UpdateTaskDto,
  ): Promise<ApiResponse<TaskResponseItem>> {
    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        organizationId: currentUser.organizationId,
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const task = await this.prisma.task.findFirst({
      where: {
        id: taskId,
        projectId,
      },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    // Role-based restrictions for TEAM_MEMBER
    if (currentUser.role === Role.TEAM_MEMBER) {
      if (task.assigneeId !== currentUser.id) {
        throw new ForbiddenException(
          'Team members can only update tasks assigned to them',
        );
      }

      if (
        dto.title !== undefined ||
        dto.priority !== undefined ||
        dto.milestoneId !== undefined ||
        dto.assigneeId !== undefined ||
        dto.dueDate !== undefined
      ) {
        throw new ForbiddenException(
          'Team members can only update task status and description',
        );
      }
    }

    if (dto.assigneeId) {
      await this.validateAssigneeMembership(
        currentUser.organizationId,
        projectId,
        dto.assigneeId,
      );
    }

    if (dto.milestoneId) {
      await this.validateMilestoneInProject(projectId, dto.milestoneId);
    }

    let completedAt = task.completedAt;
    if (dto.status === TaskStatus.DONE && task.status !== TaskStatus.DONE) {
      completedAt = new Date();
    } else if (
      dto.status &&
      dto.status !== TaskStatus.DONE &&
      task.status === TaskStatus.DONE
    ) {
      completedAt = null;
    }

    const updated = await this.prisma.task.update({
      where: { id: taskId },
      data: {
        ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
        ...(dto.description !== undefined
          ? { description: dto.description?.trim() || null }
          : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.priority !== undefined ? { priority: dto.priority } : {}),
        ...(dto.milestoneId !== undefined
          ? { milestoneId: dto.milestoneId }
          : {}),
        ...(dto.assigneeId !== undefined ? { assigneeId: dto.assigneeId } : {}),
        ...(dto.dueDate !== undefined
          ? { dueDate: dto.dueDate ? new Date(dto.dueDate) : null }
          : {}),
        completedAt,
      },
      include: {
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        milestone: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
      },
    });

    return {
      success: true,
      data: updated,
    };
  }

  async remove(
    currentUser: AuthenticatedUser,
    projectId: string,
    taskId: string,
  ): Promise<{ success: boolean; message: string }> {
    if (
      currentUser.role === Role.TEAM_MEMBER ||
      currentUser.role === Role.CLIENT
    ) {
      throw new ForbiddenException('Forbidden resource');
    }

    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        organizationId: currentUser.organizationId,
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const task = await this.prisma.task.findFirst({
      where: {
        id: taskId,
        projectId,
      },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    await this.prisma.task.delete({
      where: { id: taskId },
    });

    return {
      success: true,
      message: 'Task deleted successfully',
    };
  }

  private async validateAssigneeMembership(
    organizationId: string,
    projectId: string,
    assigneeId: string,
  ): Promise<void> {
    const user = await this.prisma.user.findFirst({
      where: {
        id: assigneeId,
        organizationId,
      },
    });

    if (!user) {
      throw new BadRequestException(
        'Assignee must be a member of this project',
      );
    }

    const membership = await this.prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId: assigneeId,
        },
      },
    });

    if (!membership) {
      throw new BadRequestException(
        'Assignee must be a member of this project',
      );
    }
  }

  private async validateMilestoneInProject(
    projectId: string,
    milestoneId: string,
  ): Promise<void> {
    const milestone = await this.prisma.milestone.findFirst({
      where: {
        id: milestoneId,
        projectId,
      },
    });

    if (!milestone) {
      throw new BadRequestException(
        'Milestone does not belong to this project',
      );
    }
  }
}
