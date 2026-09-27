import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateMilestoneDto } from './dto/create-milestone.dto.js';
import { UpdateMilestoneDto } from './dto/update-milestone.dto.js';
import { ListMilestoneQueryDto } from './dto/list-milestone-query.dto.js';
import {
  PaginatedResponse,
  ApiResponse,
} from '../common/interfaces/paginated-response.interface.js';
import { MilestoneStatus, TaskStatus, Prisma } from '@prisma/client';

export interface MilestoneResponseItem {
  id: string;
  projectId: string;
  name: string;
  description: string | null;
  status: MilestoneStatus;
  startDate: Date | null;
  dueDate: Date | null;
  completedAt: Date | null;
  progress: number;
  taskCount: number;
  completedTaskCount: number;
  createdAt: Date;
  updatedAt: Date;
  project?: {
    id: string;
    name: string;
  };
}

@Injectable()
export class MilestonesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    organizationId: string,
    projectId: string,
    dto: CreateMilestoneDto,
  ): Promise<ApiResponse<MilestoneResponseItem>> {
    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        organizationId,
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (dto.startDate && dto.dueDate) {
      const start = new Date(dto.startDate);
      const due = new Date(dto.dueDate);
      if (start > due) {
        throw new BadRequestException('Due date cannot be before start date');
      }
    }

    const milestone = await this.prisma.milestone.create({
      data: {
        projectId,
        name: dto.name.trim(),
        description: dto.description?.trim() || null,
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        status: dto.status ?? MilestoneStatus.PENDING,
      },
    });

    return {
      success: true,
      data: {
        id: milestone.id,
        projectId: milestone.projectId,
        name: milestone.name,
        description: milestone.description,
        status: milestone.status,
        startDate: milestone.startDate,
        dueDate: milestone.dueDate,
        completedAt: milestone.completedAt,
        progress: 0,
        taskCount: 0,
        completedTaskCount: 0,
        createdAt: milestone.createdAt,
        updatedAt: milestone.updatedAt,
      },
    };
  }

  async findAll(
    organizationId: string,
    projectId: string,
    query: ListMilestoneQueryDto,
  ): Promise<PaginatedResponse<MilestoneResponseItem>> {
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

    const where: Prisma.MilestoneWhereInput = {
      projectId,
    };

    if (query.status) {
      where.status = query.status;
    }

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [total, milestones] = await Promise.all([
      this.prisma.milestone.count({ where }),
      this.prisma.milestone.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    if (milestones.length === 0) {
      return {
        success: true,
        data: [],
        meta: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit) || 1,
        },
      };
    }

    const milestoneIds = milestones.map((m) => m.id);
    const taskStats = await this.prisma.task.groupBy({
      by: ['milestoneId', 'status'],
      where: {
        milestoneId: { in: milestoneIds },
      },
      _count: {
        _all: true,
      },
    });

    const statsMap = new Map<string, { total: number; done: number }>();
    for (const stat of taskStats) {
      if (!stat.milestoneId) continue;
      const current = statsMap.get(stat.milestoneId) || { total: 0, done: 0 };
      current.total += stat._count._all;
      if (stat.status === TaskStatus.DONE) {
        current.done += stat._count._all;
      }
      statsMap.set(stat.milestoneId, current);
    }

    const data: MilestoneResponseItem[] = milestones.map((m) => {
      const stats = statsMap.get(m.id) || { total: 0, done: 0 };
      const progress =
        stats.total > 0
          ? Math.round((stats.done / stats.total) * 100)
          : m.status === MilestoneStatus.COMPLETED
            ? 100
            : 0;

      return {
        id: m.id,
        projectId: m.projectId,
        name: m.name,
        description: m.description,
        status: m.status,
        startDate: m.startDate,
        dueDate: m.dueDate,
        completedAt: m.completedAt,
        progress,
        taskCount: stats.total,
        completedTaskCount: stats.done,
        createdAt: m.createdAt,
        updatedAt: m.updatedAt,
      };
    });

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      success: true,
      data,
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
    milestoneId: string,
  ): Promise<ApiResponse<MilestoneResponseItem>> {
    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        organizationId,
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const milestone = await this.prisma.milestone.findFirst({
      where: {
        id: milestoneId,
        projectId,
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!milestone) {
      throw new NotFoundException('Milestone not found');
    }

    const [totalTasks, completedTasks] = await Promise.all([
      this.prisma.task.count({ where: { milestoneId } }),
      this.prisma.task.count({
        where: { milestoneId, status: TaskStatus.DONE },
      }),
    ]);

    const progress =
      totalTasks > 0
        ? Math.round((completedTasks / totalTasks) * 100)
        : milestone.status === MilestoneStatus.COMPLETED
          ? 100
          : 0;

    return {
      success: true,
      data: {
        id: milestone.id,
        projectId: milestone.projectId,
        name: milestone.name,
        description: milestone.description,
        status: milestone.status,
        startDate: milestone.startDate,
        dueDate: milestone.dueDate,
        completedAt: milestone.completedAt,
        progress,
        taskCount: totalTasks,
        completedTaskCount: completedTasks,
        createdAt: milestone.createdAt,
        updatedAt: milestone.updatedAt,
        project: milestone.project,
      },
    };
  }

  async update(
    organizationId: string,
    projectId: string,
    milestoneId: string,
    dto: UpdateMilestoneDto,
  ): Promise<ApiResponse<MilestoneResponseItem>> {
    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        organizationId,
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const milestone = await this.prisma.milestone.findFirst({
      where: {
        id: milestoneId,
        projectId,
      },
    });

    if (!milestone) {
      throw new NotFoundException('Milestone not found');
    }

    const effectiveStartDate =
      dto.startDate !== undefined
        ? dto.startDate
          ? new Date(dto.startDate)
          : null
        : milestone.startDate;

    const effectiveDueDate =
      dto.dueDate !== undefined
        ? dto.dueDate
          ? new Date(dto.dueDate)
          : null
        : milestone.dueDate;

    if (
      effectiveStartDate &&
      effectiveDueDate &&
      effectiveStartDate > effectiveDueDate
    ) {
      throw new BadRequestException('Due date cannot be before start date');
    }

    if (dto.status === MilestoneStatus.COMPLETED) {
      const unfinishedCount = await this.prisma.task.count({
        where: {
          milestoneId,
          status: { not: TaskStatus.DONE },
        },
      });

      if (unfinishedCount > 0) {
        throw new ConflictException(
          'Milestone cannot be completed while unfinished tasks exist',
        );
      }
    }

    let completedAt = milestone.completedAt;
    if (dto.status === MilestoneStatus.COMPLETED) {
      completedAt = new Date();
    } else if (dto.status && milestone.status === MilestoneStatus.COMPLETED) {
      completedAt = null;
    }

    const updated = await this.prisma.milestone.update({
      where: { id: milestoneId },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.description !== undefined
          ? { description: dto.description?.trim() || null }
          : {}),
        ...(dto.startDate !== undefined
          ? {
              startDate: dto.startDate ? new Date(dto.startDate) : null,
            }
          : {}),
        ...(dto.dueDate !== undefined
          ? {
              dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
            }
          : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        completedAt,
      },
    });

    const [totalTasks, completedTasks] = await Promise.all([
      this.prisma.task.count({ where: { milestoneId } }),
      this.prisma.task.count({
        where: { milestoneId, status: TaskStatus.DONE },
      }),
    ]);

    const progress =
      totalTasks > 0
        ? Math.round((completedTasks / totalTasks) * 100)
        : updated.status === MilestoneStatus.COMPLETED
          ? 100
          : 0;

    return {
      success: true,
      data: {
        id: updated.id,
        projectId: updated.projectId,
        name: updated.name,
        description: updated.description,
        status: updated.status,
        startDate: updated.startDate,
        dueDate: updated.dueDate,
        completedAt: updated.completedAt,
        progress,
        taskCount: totalTasks,
        completedTaskCount: completedTasks,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
      },
    };
  }

  async remove(
    organizationId: string,
    projectId: string,
    milestoneId: string,
  ): Promise<{ success: boolean; message: string }> {
    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        organizationId,
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const milestone = await this.prisma.milestone.findFirst({
      where: {
        id: milestoneId,
        projectId,
      },
    });

    if (!milestone) {
      throw new NotFoundException('Milestone not found');
    }

    const taskCount = await this.prisma.task.count({
      where: { milestoneId },
    });

    if (taskCount > 0) {
      throw new ConflictException(
        'Cannot delete milestone with existing tasks',
      );
    }

    await this.prisma.milestone.delete({
      where: { id: milestoneId },
    });

    return {
      success: true,
      message: 'Milestone deleted successfully',
    };
  }
}
