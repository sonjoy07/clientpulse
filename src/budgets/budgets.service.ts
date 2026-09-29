import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { BudgetCalculationService } from './budget-calculation.service.js';
import { CreateBudgetDto } from './dto/create-budget.dto.js';
import { UpdateBudgetDto } from './dto/update-budget.dto.js';
import { AddCostEntryDto } from './dto/add-cost-entry.dto.js';
import { UpdateCostEntryDto } from './dto/update-cost-entry.dto.js';
import { ListCostEntryQueryDto } from './dto/list-cost-entry-query.dto.js';
import {
  BudgetResponse,
  BudgetSummary,
  CostBreakdownItem,
  MonthlyCostItem,
} from './budgets.types.js';
import {
  PaginatedResponse,
  ApiResponse,
} from '../common/interfaces/paginated-response.interface.js';
import { CostCategory, Prisma } from '@prisma/client';

export interface CostEntryResponseItem {
  id: string;
  projectId: string;
  amount: number;
  category: CostCategory;
  description: string | null;
  incurredAt: Date;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: {
    id: string;
    name: string;
  };
}

@Injectable()
export class BudgetsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly calculationService: BudgetCalculationService,
  ) {}

  async createBudget(
    organizationId: string,
    projectId: string,
    dto: CreateBudgetDto,
  ): Promise<ApiResponse<BudgetResponse>> {
    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        organizationId,
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const existingBudget = await this.prisma.projectBudget.findUnique({
      where: { projectId },
    });

    if (existingBudget) {
      throw new ConflictException('Project budget already exists');
    }

    const currency = (dto.currency || 'USD').toUpperCase();
    const budget = await this.prisma.projectBudget.create({
      data: {
        projectId,
        totalBudget: new Prisma.Decimal(dto.totalBudget),
        currency,
      },
    });

    const costAgg = await this.prisma.costEntry.aggregate({
      where: { projectId },
      _sum: { amount: true },
    });

    const spent = costAgg._sum.amount ? Number(costAgg._sum.amount) : 0;
    const totalBudget = Number(budget.totalBudget);
    const remaining = Math.round((totalBudget - spent) * 100) / 100;
    const budgetUsedPercentage =
      totalBudget > 0 ? Math.round((spent / totalBudget) * 10000) / 100 : 0;

    return {
      success: true,
      data: {
        projectId: budget.projectId,
        totalBudget,
        currency: budget.currency,
        spent,
        remaining,
        budgetUsedPercentage,
      },
    };
  }

  async getBudget(
    organizationId: string,
    projectId: string,
  ): Promise<ApiResponse<BudgetResponse>> {
    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        organizationId,
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const budget = await this.prisma.projectBudget.findUnique({
      where: { projectId },
    });

    if (!budget) {
      throw new NotFoundException('Project budget not found');
    }

    const costAgg = await this.prisma.costEntry.aggregate({
      where: { projectId },
      _sum: { amount: true },
    });

    const spent = costAgg._sum.amount ? Number(costAgg._sum.amount) : 0;
    const totalBudget = Number(budget.totalBudget);
    const remaining = Math.round((totalBudget - spent) * 100) / 100;
    const budgetUsedPercentage =
      totalBudget > 0 ? Math.round((spent / totalBudget) * 10000) / 100 : 0;

    return {
      success: true,
      data: {
        projectId: budget.projectId,
        totalBudget,
        currency: budget.currency,
        spent,
        remaining,
        budgetUsedPercentage,
      },
    };
  }

  async updateBudget(
    organizationId: string,
    projectId: string,
    dto: UpdateBudgetDto,
  ): Promise<ApiResponse<BudgetResponse>> {
    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        organizationId,
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const budget = await this.prisma.projectBudget.findUnique({
      where: { projectId },
    });

    if (!budget) {
      throw new NotFoundException('Project budget not found');
    }

    if (dto.currency && dto.currency.toUpperCase() !== budget.currency) {
      const costCount = await this.prisma.costEntry.count({
        where: { projectId },
      });
      if (costCount > 0) {
        throw new ConflictException(
          'Cannot change currency after cost entries have been recorded',
        );
      }
    }

    const updated = await this.prisma.projectBudget.update({
      where: { projectId },
      data: {
        ...(dto.totalBudget !== undefined
          ? { totalBudget: new Prisma.Decimal(dto.totalBudget) }
          : {}),
        ...(dto.currency !== undefined
          ? { currency: dto.currency.toUpperCase() }
          : {}),
      },
    });

    const costAgg = await this.prisma.costEntry.aggregate({
      where: { projectId },
      _sum: { amount: true },
    });

    const spent = costAgg._sum.amount ? Number(costAgg._sum.amount) : 0;
    const totalBudget = Number(updated.totalBudget);
    const remaining = Math.round((totalBudget - spent) * 100) / 100;
    const budgetUsedPercentage =
      totalBudget > 0 ? Math.round((spent / totalBudget) * 10000) / 100 : 0;

    return {
      success: true,
      data: {
        projectId: updated.projectId,
        totalBudget,
        currency: updated.currency,
        spent,
        remaining,
        budgetUsedPercentage,
      },
    };
  }

  async addCostEntry(
    organizationId: string,
    projectId: string,
    createdById: string,
    dto: AddCostEntryDto,
  ): Promise<ApiResponse<CostEntryResponseItem>> {
    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        organizationId,
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const cost = await this.prisma.costEntry.create({
      data: {
        projectId,
        amount: new Prisma.Decimal(dto.amount),
        category: dto.category,
        description: dto.description?.trim() || null,
        incurredAt: dto.incurredAt ? new Date(dto.incurredAt) : new Date(),
        createdById,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return {
      success: true,
      data: {
        id: cost.id,
        projectId: cost.projectId,
        amount: Number(cost.amount),
        category: cost.category,
        description: cost.description,
        incurredAt: cost.incurredAt,
        createdById: cost.createdById,
        createdAt: cost.createdAt,
        updatedAt: cost.updatedAt,
        createdBy: cost.createdBy,
      },
    };
  }

  async findAllCosts(
    organizationId: string,
    projectId: string,
    query: ListCostEntryQueryDto,
  ): Promise<PaginatedResponse<CostEntryResponseItem>> {
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

    const where: Prisma.CostEntryWhereInput = {
      projectId,
    };

    if (query.category) {
      where.category = query.category;
    }

    if (query.fromDate || query.toDate) {
      where.incurredAt = {};
      if (query.fromDate) {
        where.incurredAt.gte = new Date(query.fromDate);
      }
      if (query.toDate) {
        where.incurredAt.lte = new Date(query.toDate);
      }
    }

    if (query.search) {
      where.description = { contains: query.search, mode: 'insensitive' };
    }

    const [total, items] = await Promise.all([
      this.prisma.costEntry.count({ where }),
      this.prisma.costEntry.findMany({
        where,
        skip,
        take: limit,
        orderBy: { incurredAt: 'desc' },
        include: {
          createdBy: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
    ]);

    const data: CostEntryResponseItem[] = items.map((item) => ({
      id: item.id,
      projectId: item.projectId,
      amount: Number(item.amount),
      category: item.category,
      description: item.description,
      incurredAt: item.incurredAt,
      createdById: item.createdById,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      createdBy: item.createdBy,
    }));

    return {
      success: true,
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async findOneCost(
    organizationId: string,
    projectId: string,
    costId: string,
  ): Promise<ApiResponse<CostEntryResponseItem>> {
    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        organizationId,
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const cost = await this.prisma.costEntry.findFirst({
      where: {
        id: costId,
        projectId,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!cost) {
      throw new NotFoundException('Cost entry not found');
    }

    return {
      success: true,
      data: {
        id: cost.id,
        projectId: cost.projectId,
        amount: Number(cost.amount),
        category: cost.category,
        description: cost.description,
        incurredAt: cost.incurredAt,
        createdById: cost.createdById,
        createdAt: cost.createdAt,
        updatedAt: cost.updatedAt,
        createdBy: cost.createdBy,
      },
    };
  }

  async updateCostEntry(
    organizationId: string,
    projectId: string,
    costId: string,
    dto: UpdateCostEntryDto,
  ): Promise<ApiResponse<CostEntryResponseItem>> {
    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        organizationId,
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const cost = await this.prisma.costEntry.findFirst({
      where: {
        id: costId,
        projectId,
      },
    });

    if (!cost) {
      throw new NotFoundException('Cost entry not found');
    }

    const updated = await this.prisma.costEntry.update({
      where: { id: costId },
      data: {
        ...(dto.amount !== undefined
          ? { amount: new Prisma.Decimal(dto.amount) }
          : {}),
        ...(dto.category !== undefined ? { category: dto.category } : {}),
        ...(dto.description !== undefined
          ? { description: dto.description?.trim() || null }
          : {}),
        ...(dto.incurredAt !== undefined
          ? { incurredAt: new Date(dto.incurredAt) }
          : {}),
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return {
      success: true,
      data: {
        id: updated.id,
        projectId: updated.projectId,
        amount: Number(updated.amount),
        category: updated.category,
        description: updated.description,
        incurredAt: updated.incurredAt,
        createdById: updated.createdById,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
        createdBy: updated.createdBy,
      },
    };
  }

  async deleteCostEntry(
    organizationId: string,
    projectId: string,
    costId: string,
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

    const cost = await this.prisma.costEntry.findFirst({
      where: {
        id: costId,
        projectId,
      },
    });

    if (!cost) {
      throw new NotFoundException('Cost entry not found');
    }

    await this.prisma.costEntry.delete({
      where: { id: costId },
    });

    return {
      success: true,
      message: 'Cost entry deleted successfully',
    };
  }

  async getBudgetSummary(
    organizationId: string,
    projectId: string,
  ): Promise<ApiResponse<BudgetSummary>> {
    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        organizationId,
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const [budget, costAgg] = await Promise.all([
      this.prisma.projectBudget.findUnique({
        where: { projectId },
      }),
      this.prisma.costEntry.aggregate({
        where: { projectId },
        _sum: { amount: true },
      }),
    ]);

    const spent = costAgg._sum.amount ? Number(costAgg._sum.amount) : 0;
    const totalBudget = budget ? Number(budget.totalBudget) : null;
    const currency = budget ? budget.currency : 'USD';

    const summary = this.calculationService.calculateSummary(
      totalBudget,
      currency,
      spent,
      project.startDate,
      project.endDate,
    );

    return {
      success: true,
      data: summary,
    };
  }

  async getCostBreakdown(
    organizationId: string,
    projectId: string,
  ): Promise<ApiResponse<CostBreakdownItem[]>> {
    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        organizationId,
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const groups = await this.prisma.costEntry.groupBy({
      by: ['category'],
      where: { projectId },
      _sum: { amount: true },
    });

    const totalSpent = groups.reduce(
      (sum, g) => sum + (g._sum.amount ? Number(g._sum.amount) : 0),
      0,
    );

    const breakdown: CostBreakdownItem[] = groups.map((g) => {
      const amount = g._sum.amount ? Number(g._sum.amount) : 0;
      const percentage =
        totalSpent > 0 ? Math.round((amount / totalSpent) * 10000) / 100 : 0;
      return {
        category: g.category,
        amount: Math.round(amount * 100) / 100,
        percentage,
      };
    });

    return {
      success: true,
      data: breakdown,
    };
  }

  async getMonthlyCostSummary(
    organizationId: string,
    projectId: string,
  ): Promise<ApiResponse<MonthlyCostItem[]>> {
    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        organizationId,
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const rows = await this.prisma.$queryRaw<
      Array<{ month: string; amount: string | number }>
    >`
      SELECT TO_CHAR("incurredAt", 'YYYY-MM') AS month,
             COALESCE(SUM(amount), 0)::numeric AS amount
      FROM "cost_entries"
      WHERE "projectId" = ${projectId}
      GROUP BY TO_CHAR("incurredAt", 'YYYY-MM')
      ORDER BY month ASC
    `;

    const data: MonthlyCostItem[] = rows.map((r) => ({
      month: r.month,
      amount: Number(Number(r.amount).toFixed(2)),
    }));

    return {
      success: true,
      data,
    };
  }
}
