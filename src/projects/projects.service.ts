import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import {
  Prisma,
  ProjectStatus,
  MilestoneStatus,
  TaskStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateProjectDto } from './dto/create-project.dto.js';
import { UpdateProjectDto } from './dto/update-project.dto.js';
import { ListProjectQueryDto } from './dto/list-project-query.dto.js';
import {
  PaginatedResponse,
  ApiResponse,
} from '../common/interfaces/paginated-response.interface.js';
import {
  DeliverySummary,
  calculateTimelineStatus,
} from './delivery-summary.types.js';
import {
  RiskEngineService,
  RiskEvaluationInput,
} from './services/risk-engine.service.js';
import { HealthScoreService } from './services/health-score.service.js';
import {
  ProjectHealthResult,
  ProjectRisk,
  ProjectHealthStatus,
  RiskSeverity,
} from './services/risk-engine.types.js';

@Injectable()
export class ProjectsService {
  private readonly riskEngineService = new RiskEngineService();
  private readonly healthScoreService = new HealthScoreService();

  constructor(private readonly prisma: PrismaService) {}

  async create(organizationId: string, dto: CreateProjectDto) {
    // 1. Verify client exists and belongs to the user's organization
    const client = await this.prisma.client.findFirst({
      where: {
        id: dto.clientId,
        organizationId,
      },
    });

    if (!client) {
      throw new NotFoundException('Client not found within your organization');
    }

    // 2. Validate date range
    const startDate = dto.startDate ? new Date(dto.startDate) : null;
    const endDate = dto.endDate ? new Date(dto.endDate) : null;

    if (startDate && endDate && startDate > endDate) {
      throw new BadRequestException(
        'startDate must be before or equal to endDate',
      );
    }

    // 3. Create project under the same organization
    const project = await this.prisma.project.create({
      data: {
        organizationId,
        clientId: dto.clientId,
        name: dto.name,
        description: dto.description,
        status: dto.status ?? ProjectStatus.PLANNING,
        startDate,
        endDate,
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            companyName: true,
          },
        },
        _count: {
          select: {
            projectMembers: true,
            milestones: true,
            tasks: true,
          },
        },
      },
    });

    return {
      success: true,
      data: project,
    };
  }

  async findAll(
    organizationId: string,
    query: ListProjectQueryDto,
  ): Promise<PaginatedResponse<unknown>> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 10));
    const skip = (page - 1) * limit;

    const where: Prisma.ProjectWhereInput = {
      organizationId,
    };

    if (query.status) {
      where.status = query.status;
    }

    if (query.clientId) {
      where.clientId = query.clientId;
    }

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [total, items] = await this.prisma.$transaction([
      this.prisma.project.count({ where }),
      this.prisma.project.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          client: {
            select: {
              id: true,
              companyName: true,
            },
          },
          _count: {
            select: {
              projectMembers: true,
              milestones: true,
              tasks: true,
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

  async findOne(organizationId: string, id: string) {
    const project = await this.prisma.project.findFirst({
      where: {
        id,
        organizationId,
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            companyName: true,
            email: true,
          },
        },
        _count: {
          select: {
            projectMembers: true,
            milestones: true,
            tasks: true,
          },
        },
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    return {
      success: true,
      data: project,
    };
  }

  async update(organizationId: string, id: string, dto: UpdateProjectDto) {
    const existing = await this.prisma.project.findFirst({
      where: {
        id,
        organizationId,
      },
    });

    if (!existing) {
      throw new NotFoundException('Project not found');
    }

    const effectiveStartDate =
      dto.startDate !== undefined
        ? dto.startDate
          ? new Date(dto.startDate)
          : null
        : existing.startDate;

    const effectiveEndDate =
      dto.endDate !== undefined
        ? dto.endDate
          ? new Date(dto.endDate)
          : null
        : existing.endDate;

    if (
      effectiveStartDate &&
      effectiveEndDate &&
      effectiveStartDate > effectiveEndDate
    ) {
      throw new BadRequestException(
        'startDate must be before or equal to endDate',
      );
    }

    const updated = await this.prisma.project.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.startDate !== undefined && {
          startDate: dto.startDate ? new Date(dto.startDate) : null,
        }),
        ...(dto.endDate !== undefined && {
          endDate: dto.endDate ? new Date(dto.endDate) : null,
        }),
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            companyName: true,
          },
        },
        _count: {
          select: {
            projectMembers: true,
            milestones: true,
            tasks: true,
          },
        },
      },
    });

    return {
      success: true,
      data: updated,
    };
  }

  async remove(organizationId: string, id: string) {
    const project = await this.prisma.project.findFirst({
      where: {
        id,
        organizationId,
      },
      include: {
        _count: {
          select: {
            milestones: true,
            tasks: true,
          },
        },
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const dependentCount = project._count.milestones + project._count.tasks;
    if (dependentCount > 0) {
      throw new ConflictException(
        `Cannot delete project with ${project._count.milestones} milestone(s) and ${project._count.tasks} task(s). Remove dependent milestones and tasks first.`,
      );
    }

    await this.prisma.project.delete({
      where: { id },
    });

    return {
      success: true,
      message: 'Project deleted successfully',
    };
  }

  async getDeliverySummary(
    organizationId: string,
    projectId: string,
  ): Promise<ApiResponse<DeliverySummary>> {
    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        organizationId,
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const [taskGroups, milestoneGroups] = await Promise.all([
      this.prisma.task.groupBy({
        by: ['status'],
        where: { projectId },
        _count: { _all: true },
      }),
      this.prisma.milestone.groupBy({
        by: ['status'],
        where: { projectId },
        _count: { _all: true },
      }),
    ]);

    const taskStats = {
      total: 0,
      todo: 0,
      inProgress: 0,
      blocked: 0,
      done: 0,
    };

    for (const group of taskGroups) {
      taskStats.total += group._count._all;
      if (group.status === TaskStatus.TODO) taskStats.todo = group._count._all;
      else if (group.status === TaskStatus.IN_PROGRESS)
        taskStats.inProgress = group._count._all;
      else if (group.status === TaskStatus.BLOCKED)
        taskStats.blocked = group._count._all;
      else if (group.status === TaskStatus.DONE)
        taskStats.done = group._count._all;
    }

    const milestoneStats = {
      total: 0,
      completed: 0,
      inProgress: 0,
      blocked: 0,
      pending: 0,
    };

    for (const group of milestoneGroups) {
      milestoneStats.total += group._count._all;
      if (group.status === MilestoneStatus.COMPLETED)
        milestoneStats.completed = group._count._all;
      else if (group.status === MilestoneStatus.IN_PROGRESS)
        milestoneStats.inProgress = group._count._all;
      else if (group.status === MilestoneStatus.BLOCKED)
        milestoneStats.blocked = group._count._all;
      else if (group.status === MilestoneStatus.PENDING)
        milestoneStats.pending = group._count._all;
    }

    const progress =
      taskStats.total > 0
        ? Math.round((taskStats.done / taskStats.total) * 100)
        : 0;

    const timeline = calculateTimelineStatus(
      project.status,
      project.startDate,
      project.endDate,
      progress,
    );

    return {
      success: true,
      data: {
        projectId: project.id,
        projectName: project.name,
        progress,
        tasks: taskStats,
        milestones: milestoneStats,
        timeline,
      },
    };
  }

  async getProjectRisks(
    organizationId: string,
    projectId: string,
  ): Promise<{ success: boolean; data: ProjectRisk[] }> {
    const health = await this.getProjectHealth(organizationId, projectId);
    return {
      success: true,
      data: health.data.risks,
    };
  }

  async getProjectHealth(
    organizationId: string,
    projectId: string,
  ): Promise<{ success: boolean; data: ProjectHealthResult }> {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, organizationId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const deliveryRes = await this.getDeliverySummary(
      organizationId,
      projectId,
    );
    const delivery = deliveryRes.data;

    const now = new Date();
    const overdueMilestonesCount = await this.prisma.milestone.count({
      where: {
        projectId,
        status: { not: MilestoneStatus.COMPLETED },
        dueDate: { lt: now },
      },
    });

    const budgetRecord = await this.prisma.projectBudget.findUnique({
      where: { projectId },
    });

    let budgetBurnPercentage: number | undefined = undefined;
    if (budgetRecord && Number(budgetRecord.totalBudget) > 0) {
      const costAgg = await this.prisma.costEntry.aggregate({
        where: { projectId },
        _sum: { amount: true },
      });
      const spent = costAgg._sum.amount ? Number(costAgg._sum.amount) : 0;
      budgetBurnPercentage = Math.round(
        (spent / Number(budgetRecord.totalBudget)) * 100,
      );
    }

    const maxMemberAgg = await this.prisma.projectMember.aggregate({
      where: { projectId },
      _max: { allocationPercentage: true },
    });
    const maxMemberAllocation = maxMemberAgg._max.allocationPercentage ?? 0;

    const isOverdue = project.endDate
      ? project.endDate < now && project.status !== ProjectStatus.COMPLETED
      : false;

    const riskInput: RiskEvaluationInput = {
      budgetBurnPercentage,
      timeBurnPercentage: delivery.timeline.expectedProgress,
      isOverdue,
      maxMemberAllocation,
      blockedTasksCount: delivery.tasks.blocked,
      overdueMilestonesCount,
      now,
    };

    const risks = this.riskEngineService.evaluateRisks(riskInput);
    const health = this.healthScoreService.calculateHealth(risks);

    return {
      success: true,
      data: health,
    };
  }

  async getPortfolioSummary(organizationId: string) {
    const projects = await this.prisma.project.findMany({
      where: { organizationId },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            companyName: true,
          },
        },
        milestones: {
          select: {
            id: true,
            name: true,
            status: true,
            dueDate: true,
          },
        },
        _count: {
          select: {
            tasks: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const now = new Date();
    const in14Days = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

    let healthyCount = 0;
    let atRiskCount = 0;
    let criticalCount = 0;
    let totalProgressSum = 0;
    let progressProjectCount = 0;

    const criticalRisks: Array<{
      projectId: string;
      projectName: string;
      severity: string;
      title: string;
      description: string;
    }> = [];

    const upcomingDeadlines: Array<{
      id: string;
      projectId: string;
      projectName: string;
      title: string;
      dueDate: Date;
      type: 'PROJECT' | 'MILESTONE';
      isOverdue: boolean;
      status: string;
    }> = [];

    for (const project of projects) {
      if (project.endDate && project.status !== ProjectStatus.COMPLETED) {
        if (project.endDate <= in14Days) {
          upcomingDeadlines.push({
            id: project.id,
            projectId: project.id,
            projectName: project.name,
            title: `${project.name} Deadline`,
            dueDate: project.endDate,
            type: 'PROJECT',
            isOverdue: project.endDate < now,
            status: project.status,
          });
        }
      }

      for (const ms of project.milestones) {
        if (ms.dueDate && ms.status !== MilestoneStatus.COMPLETED) {
          if (ms.dueDate <= in14Days) {
            upcomingDeadlines.push({
              id: ms.id,
              projectId: project.id,
              projectName: project.name,
              title: ms.name,
              dueDate: ms.dueDate,
              type: 'MILESTONE',
              isOverdue: ms.dueDate < now,
              status: ms.status,
            });
          }
        }
      }

      try {
        const healthRes = await this.getProjectHealth(
          organizationId,
          project.id,
        );
        const health = healthRes.data;
        if (health.status === ProjectHealthStatus.HEALTHY) healthyCount++;
        else if (health.status === ProjectHealthStatus.AT_RISK) atRiskCount++;
        else if (health.status === ProjectHealthStatus.CRITICAL)
          criticalCount++;

        for (const risk of health.risks) {
          if (
            risk.severity === RiskSeverity.CRITICAL ||
            risk.severity === RiskSeverity.HIGH
          ) {
            criticalRisks.push({
              projectId: project.id,
              projectName: project.name,
              severity: risk.severity,
              title: risk.title,
              description: risk.description,
            });
          }
        }
      } catch {
        healthyCount++;
      }

      try {
        const deliveryRes = await this.getDeliverySummary(
          organizationId,
          project.id,
        );
        totalProgressSum += deliveryRes.data.progress;
        progressProjectCount++;
      } catch {
        // Ignore individual project summary failure
      }
    }

    upcomingDeadlines.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());

    const averageProgress =
      progressProjectCount > 0
        ? Math.round(totalProgressSum / progressProjectCount)
        : 0;

    return {
      success: true,
      data: {
        totalProjects: projects.length,
        healthyCount,
        atRiskCount,
        criticalCount,
        averageProgress,
        upcomingDeadlines: upcomingDeadlines.slice(0, 10),
        criticalRisks: criticalRisks.slice(0, 10),
      },
    };
  }
}
