import { Injectable, NotFoundException } from '@nestjs/common';
import { MilestoneStatus, TaskStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service.js';
import { ProjectsService } from '../../projects/projects.service.js';
import { TimelineStatus } from '../../projects/delivery-summary.types.js';
import {
  ProjectReportSnapshot,
  ProjectMilestoneItemSnapshot,
} from '../interfaces/project-report-snapshot.interface.js';

@Injectable()
export class AiReportSnapshotService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly projectsService: ProjectsService,
  ) {}

  async buildSnapshot(
    organizationId: string,
    projectId: string,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<ProjectReportSnapshot> {
    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        organizationId,
      },
      include: {
        client: {
          select: {
            name: true,
            companyName: true,
          },
        },
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // 1. Authoritative delivery summary
    const deliverySummaryRes = await this.projectsService.getDeliverySummary(
      organizationId,
      projectId,
    );
    const deliveryData = deliverySummaryRes.data;

    // 2. Milestones snapshot
    const milestones = await this.prisma.milestone.findMany({
      where: { projectId },
      select: {
        name: true,
        status: true,
        dueDate: true,
      },
      orderBy: { dueDate: 'asc' },
    });

    const milestoneItems: ProjectMilestoneItemSnapshot[] = milestones.map(
      (m) => ({
        name: m.name,
        status: m.status,
        dueDate: m.dueDate ? m.dueDate.toISOString().split('T')[0] : null,
      }),
    );

    // 3. Blockers identification (sanitized titles only)
    const blockedTasks = await this.prisma.task.findMany({
      where: {
        projectId,
        status: TaskStatus.BLOCKED,
      },
      select: {
        title: true,
      },
    });

    const blockers: string[] = [
      ...milestones
        .filter((m) => m.status === MilestoneStatus.BLOCKED)
        .map((m) => `Milestone blocked: ${m.name}`),
      ...blockedTasks.map((t) => `Task blocked: ${t.title}`),
    ];

    // 4. Budget snapshot
    const budgetRecord = await this.prisma.projectBudget.findUnique({
      where: { projectId },
    });

    let budgetSnapshot: ProjectReportSnapshot['budget'];

    if (budgetRecord) {
      const costAgg = await this.prisma.costEntry.aggregate({
        where: { projectId },
        _sum: { amount: true },
      });

      const spent = costAgg._sum.amount ? Number(costAgg._sum.amount) : 0;
      const totalBudget = Number(budgetRecord.totalBudget);
      const remaining = Math.round((totalBudget - spent) * 100) / 100;
      const utilizationPercentage =
        totalBudget > 0 ? Math.round((spent / totalBudget) * 10000) / 100 : 0;

      let burnRateStatus = 'NORMAL';
      if (spent > totalBudget) {
        burnRateStatus = 'OVER_BUDGET';
      } else if (utilizationPercentage >= 80) {
        burnRateStatus = 'WARNING';
      }

      budgetSnapshot = {
        hasBudget: true,
        totalBudget,
        spent,
        remaining,
        currency: budgetRecord.currency,
        utilizationPercentage,
        burnRateStatus,
      };
    } else {
      budgetSnapshot = {
        hasBudget: false,
      };
    }

    return {
      projectId: project.id,
      projectName: project.name,
      clientName: project.client.companyName || project.client.name,
      period: {
        startDate: periodStart.toISOString().split('T')[0],
        endDate: periodEnd.toISOString().split('T')[0],
      },
      delivery: {
        progressPercentage: deliveryData.progress,
        tasks: {
          total: deliveryData.tasks.total,
          completed: deliveryData.tasks.done,
          inProgress: deliveryData.tasks.inProgress,
          blocked: deliveryData.tasks.blocked,
          todo: deliveryData.tasks.todo,
        },
      },
      milestones: {
        total: deliveryData.milestones.total,
        completed: deliveryData.milestones.completed,
        inProgress: deliveryData.milestones.inProgress,
        blocked: deliveryData.milestones.blocked,
        pending: deliveryData.milestones.pending,
        milestones: milestoneItems,
      },
      budget: budgetSnapshot,
      timeline: {
        status: deliveryData.timeline.status,
        startDate: project.startDate
          ? project.startDate.toISOString().split('T')[0]
          : null,
        endDate: project.endDate
          ? project.endDate.toISOString().split('T')[0]
          : null,
        isDelayed: deliveryData.timeline.status === TimelineStatus.CRITICAL,
      },
      blockers,
    };
  }
}
