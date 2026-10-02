import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import {
  Prisma,
  ProjectStatus,
  MilestoneStatus,
  TaskStatus,
  AIReportStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { ProjectsService } from '../projects/projects.service.js';
import { calculateTimelineStatus } from '../projects/delivery-summary.types.js';
import { AuthenticatedUser } from '../auth/decorators/current-user.decorator.js';
import { ClientProjectQueryDto } from './dto/client-project-query.dto.js';
import { ClientReportQueryDto } from './dto/client-report-query.dto.js';
import { ClientAiReportResponseDto } from './dto/client-ai-report-response.dto.js';
import {
  ClientDashboardResponseDto,
  ClientProjectResponseDto,
  ClientProjectProgressResponseDto,
  ClientMilestoneResponseDto,
  ClientDeliveryStatusResponseDto,
} from './dto/client-project-response.dto.js';
import { ClientProjectSerializer } from './serializers/client-project.serializer.js';
import {
  PaginatedResponse,
  ApiResponse,
} from '../common/interfaces/paginated-response.interface.js';

@Injectable()
export class ClientPortalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly projectsService: ProjectsService,
  ) {}

  private getAndValidateClientId(user: AuthenticatedUser): string {
    if (!user.clientId) {
      throw new ForbiddenException(
        'Client account is not associated with a client profile',
      );
    }
    return user.clientId;
  }

  async getDashboard(
    user: AuthenticatedUser,
  ): Promise<ApiResponse<ClientDashboardResponseDto>> {
    const clientId = this.getAndValidateClientId(user);

    const client = await this.prisma.client.findFirst({
      where: {
        id: clientId,
        organizationId: user.organizationId,
      },
      select: {
        id: true,
        name: true,
        companyName: true,
      },
    });

    if (!client) {
      throw new ForbiddenException(
        'Client profile not found within your organization',
      );
    }

    const projects = await this.prisma.project.findMany({
      where: {
        organizationId: user.organizationId,
        clientId,
      },
      select: {
        id: true,
        name: true,
        description: true,
        status: true,
        startDate: true,
        endDate: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const projectIds = projects.map((p) => p.id);

    const [taskGroups, milestoneGroups] = await Promise.all([
      this.prisma.task.groupBy({
        by: ['projectId', 'status'],
        where: { projectId: { in: projectIds } },
        _count: { _all: true },
      }),
      this.prisma.milestone.groupBy({
        by: ['projectId', 'status'],
        where: { projectId: { in: projectIds } },
        _count: { _all: true },
      }),
    ]);

    const taskCountMap = new Map<string, { total: number; done: number }>();
    for (const group of taskGroups) {
      const current = taskCountMap.get(group.projectId) || {
        total: 0,
        done: 0,
      };
      current.total += group._count._all;
      if (group.status === TaskStatus.DONE) {
        current.done += group._count._all;
      }
      taskCountMap.set(group.projectId, current);
    }

    const milestoneStatsMap = new Map<
      string,
      { total: number; completed: number; inProgress: number; blocked: number }
    >();
    for (const group of milestoneGroups) {
      const current = milestoneStatsMap.get(group.projectId) || {
        total: 0,
        completed: 0,
        inProgress: 0,
        blocked: 0,
      };
      current.total += group._count._all;
      if (group.status === MilestoneStatus.COMPLETED) {
        current.completed += group._count._all;
      } else if (group.status === MilestoneStatus.IN_PROGRESS) {
        current.inProgress += group._count._all;
      } else if (group.status === MilestoneStatus.BLOCKED) {
        current.blocked += group._count._all;
      }
      milestoneStatsMap.set(group.projectId, current);
    }

    const serializedProjects: ClientProjectResponseDto[] = projects.map((p) => {
      const tasks = taskCountMap.get(p.id) || { total: 0, done: 0 };
      const progress =
        tasks.total > 0 ? Math.round((tasks.done / tasks.total) * 100) : 0;
      const timeline = calculateTimelineStatus(
        p.status,
        p.startDate,
        p.endDate,
        progress,
      );
      const milestoneStats = milestoneStatsMap.get(p.id) || {
        total: 0,
        completed: 0,
        inProgress: 0,
        blocked: 0,
      };

      return ClientProjectSerializer.serializeProject({
        id: p.id,
        name: p.name,
        description: p.description,
        status: p.status,
        startDate: p.startDate,
        endDate: p.endDate,
        progress,
        timelineStatus: timeline.status,
        milestoneStats,
      });
    });

    const totalProjects = projects.length;
    const activeProjects = projects.filter(
      (p) => p.status === ProjectStatus.ACTIVE,
    ).length;
    const completedProjects = projects.filter(
      (p) => p.status === ProjectStatus.COMPLETED,
    ).length;

    return {
      success: true,
      data: {
        client: {
          id: client.id,
          name: client.name,
          companyName: client.companyName,
        },
        summary: {
          totalProjects,
          activeProjects,
          completedProjects,
        },
        projects: serializedProjects,
      },
    };
  }

  async getProjects(
    user: AuthenticatedUser,
    query: ClientProjectQueryDto,
  ): Promise<PaginatedResponse<ClientProjectResponseDto>> {
    const clientId = this.getAndValidateClientId(user);

    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 10));
    const skip = (page - 1) * limit;

    const where: Prisma.ProjectWhereInput = {
      organizationId: user.organizationId,
      clientId,
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

    const [total, projects] = await Promise.all([
      this.prisma.project.count({ where }),
      this.prisma.project.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          name: true,
          description: true,
          status: true,
          startDate: true,
          endDate: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    if (projects.length === 0) {
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

    const projectIds = projects.map((p) => p.id);

    const [taskGroups, milestoneGroups] = await Promise.all([
      this.prisma.task.groupBy({
        by: ['projectId', 'status'],
        where: { projectId: { in: projectIds } },
        _count: { _all: true },
      }),
      this.prisma.milestone.groupBy({
        by: ['projectId', 'status'],
        where: { projectId: { in: projectIds } },
        _count: { _all: true },
      }),
    ]);

    const taskCountMap = new Map<string, { total: number; done: number }>();
    for (const group of taskGroups) {
      const current = taskCountMap.get(group.projectId) || {
        total: 0,
        done: 0,
      };
      current.total += group._count._all;
      if (group.status === TaskStatus.DONE) {
        current.done += group._count._all;
      }
      taskCountMap.set(group.projectId, current);
    }

    const milestoneStatsMap = new Map<
      string,
      { total: number; completed: number; inProgress: number; blocked: number }
    >();
    for (const group of milestoneGroups) {
      const current = milestoneStatsMap.get(group.projectId) || {
        total: 0,
        completed: 0,
        inProgress: 0,
        blocked: 0,
      };
      current.total += group._count._all;
      if (group.status === MilestoneStatus.COMPLETED) {
        current.completed += group._count._all;
      } else if (group.status === MilestoneStatus.IN_PROGRESS) {
        current.inProgress += group._count._all;
      } else if (group.status === MilestoneStatus.BLOCKED) {
        current.blocked += group._count._all;
      }
      milestoneStatsMap.set(group.projectId, current);
    }

    const serializedProjects: ClientProjectResponseDto[] = projects.map((p) => {
      const tasks = taskCountMap.get(p.id) || { total: 0, done: 0 };
      const progress =
        tasks.total > 0 ? Math.round((tasks.done / tasks.total) * 100) : 0;
      const timeline = calculateTimelineStatus(
        p.status,
        p.startDate,
        p.endDate,
        progress,
      );
      const milestoneStats = milestoneStatsMap.get(p.id) || {
        total: 0,
        completed: 0,
        inProgress: 0,
        blocked: 0,
      };

      return ClientProjectSerializer.serializeProject({
        id: p.id,
        name: p.name,
        description: p.description,
        status: p.status,
        startDate: p.startDate,
        endDate: p.endDate,
        progress,
        timelineStatus: timeline.status,
        milestoneStats,
      });
    });

    return {
      success: true,
      data: serializedProjects,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async getProject(
    user: AuthenticatedUser,
    projectId: string,
  ): Promise<ApiResponse<ClientProjectResponseDto>> {
    const clientId = this.getAndValidateClientId(user);

    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        organizationId: user.organizationId,
        clientId,
      },
      select: {
        id: true,
        name: true,
        description: true,
        status: true,
        startDate: true,
        endDate: true,
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

    let totalTasks = 0;
    let doneTasks = 0;
    for (const group of taskGroups) {
      totalTasks += group._count._all;
      if (group.status === TaskStatus.DONE) {
        doneTasks += group._count._all;
      }
    }

    const milestoneStats = {
      total: 0,
      completed: 0,
      inProgress: 0,
      blocked: 0,
    };
    for (const group of milestoneGroups) {
      milestoneStats.total += group._count._all;
      if (group.status === MilestoneStatus.COMPLETED) {
        milestoneStats.completed += group._count._all;
      } else if (group.status === MilestoneStatus.IN_PROGRESS) {
        milestoneStats.inProgress += group._count._all;
      } else if (group.status === MilestoneStatus.BLOCKED) {
        milestoneStats.blocked += group._count._all;
      }
    }

    const progress =
      totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
    const timeline = calculateTimelineStatus(
      project.status,
      project.startDate,
      project.endDate,
      progress,
    );

    const serialized = ClientProjectSerializer.serializeProject({
      id: project.id,
      name: project.name,
      description: project.description,
      status: project.status,
      startDate: project.startDate,
      endDate: project.endDate,
      progress,
      timelineStatus: timeline.status,
      milestoneStats,
    });

    return {
      success: true,
      data: serialized,
    };
  }

  async getProjectProgress(
    user: AuthenticatedUser,
    projectId: string,
  ): Promise<ApiResponse<ClientProjectProgressResponseDto>> {
    const clientId = this.getAndValidateClientId(user);

    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        organizationId: user.organizationId,
        clientId,
      },
      select: {
        id: true,
        name: true,
        status: true,
        startDate: true,
        endDate: true,
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const delivery = await this.projectsService.getDeliverySummary(
      user.organizationId,
      projectId,
    );

    const serialized = ClientProjectSerializer.serializeProgress({
      projectId: project.id,
      projectName: project.name,
      progress: delivery.data.progress,
      timelineStatus: delivery.data.timeline.status,
      startDate: project.startDate,
      endDate: project.endDate,
      expectedProgress: delivery.data.timeline.expectedProgress,
      actualProgress: delivery.data.timeline.actualProgress,
      milestones: {
        total: delivery.data.milestones.total,
        completed: delivery.data.milestones.completed,
        inProgress: delivery.data.milestones.inProgress,
        blocked: delivery.data.milestones.blocked,
      },
    });

    return {
      success: true,
      data: serialized,
    };
  }

  async getProjectMilestones(
    user: AuthenticatedUser,
    projectId: string,
  ): Promise<ApiResponse<ClientMilestoneResponseDto[]>> {
    const clientId = this.getAndValidateClientId(user);

    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        organizationId: user.organizationId,
        clientId,
      },
      select: { id: true },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const milestones = await this.prisma.milestone.findMany({
      where: { projectId },
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'asc' }],
      select: {
        id: true,
        name: true,
        description: true,
        status: true,
        startDate: true,
        dueDate: true,
        completedAt: true,
        tasks: {
          select: {
            status: true,
          },
        },
      },
    });

    const serializedMilestones: ClientMilestoneResponseDto[] = milestones.map(
      (m) => {
        const totalTasks = m.tasks.length;
        const doneTasks = m.tasks.filter(
          (t) => t.status === TaskStatus.DONE,
        ).length;
        const progress =
          totalTasks > 0
            ? Math.round((doneTasks / totalTasks) * 100)
            : m.status === MilestoneStatus.COMPLETED
              ? 100
              : 0;

        return ClientProjectSerializer.serializeMilestone({
          id: m.id,
          name: m.name,
          description: m.description,
          status: m.status,
          startDate: m.startDate,
          dueDate: m.dueDate,
          completedAt: m.completedAt,
          progress,
        });
      },
    );

    return {
      success: true,
      data: serializedMilestones,
    };
  }

  async getProjectDeliveryStatus(
    user: AuthenticatedUser,
    projectId: string,
  ): Promise<ApiResponse<ClientDeliveryStatusResponseDto>> {
    const clientId = this.getAndValidateClientId(user);

    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        organizationId: user.organizationId,
        clientId,
      },
      select: {
        id: true,
        name: true,
        status: true,
        startDate: true,
        endDate: true,
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const delivery = await this.projectsService.getDeliverySummary(
      user.organizationId,
      projectId,
    );

    const serialized = ClientProjectSerializer.serializeDeliveryStatus({
      projectId: project.id,
      projectName: project.name,
      timelineStatus: delivery.data.timeline.status,
      progress: delivery.data.progress,
    });

    return {
      success: true,
      data: serialized,
    };
  }

  async getProjectReports(
    user: AuthenticatedUser,
    projectId: string,
    query: ClientReportQueryDto,
  ): Promise<PaginatedResponse<ClientAiReportResponseDto>> {
    const clientId = this.getAndValidateClientId(user);

    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        organizationId: user.organizationId,
        clientId,
      },
      select: { id: true },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 10));
    const skip = (page - 1) * limit;

    const where: Prisma.AIReportWhereInput = {
      projectId,
      status: AIReportStatus.COMPLETED,
    };

    const [total, reports] = await Promise.all([
      this.prisma.aIReport.count({ where }),
      this.prisma.aIReport.findMany({
        where,
        skip,
        take: limit,
        orderBy: { periodStart: 'desc' },
      }),
    ]);

    return {
      success: true,
      data: reports.map((r) => ({
        id: r.id,
        projectId: r.projectId,
        periodStart: r.periodStart,
        periodEnd: r.periodEnd,
        summary: r.summary,
        highlights: r.highlights as string[] | null,
        achievements: r.achievements as string[] | null,
        concerns: r.concerns as string[] | null,
        nextSteps: r.nextSteps as string[] | null,
        generatedAt: r.generatedAt,
        createdAt: r.createdAt,
      })),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async getProjectReportById(
    user: AuthenticatedUser,
    projectId: string,
    reportId: string,
  ): Promise<ApiResponse<ClientAiReportResponseDto>> {
    const clientId = this.getAndValidateClientId(user);

    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        organizationId: user.organizationId,
        clientId,
      },
      select: { id: true },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const report = await this.prisma.aIReport.findFirst({
      where: {
        id: reportId,
        projectId,
        status: AIReportStatus.COMPLETED,
      },
    });

    if (!report) {
      throw new NotFoundException('AI status report not found');
    }

    return {
      success: true,
      data: {
        id: report.id,
        projectId: report.projectId,
        periodStart: report.periodStart,
        periodEnd: report.periodEnd,
        summary: report.summary,
        highlights: report.highlights as string[] | null,
        achievements: report.achievements as string[] | null,
        concerns: report.concerns as string[] | null,
        nextSteps: report.nextSteps as string[] | null,
        generatedAt: report.generatedAt,
        createdAt: report.createdAt,
      },
    };
  }
}
