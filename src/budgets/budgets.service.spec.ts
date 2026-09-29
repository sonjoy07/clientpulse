import { Test, TestingModule } from '@nestjs/testing';
import { BudgetsService } from './budgets.service.js';
import { BudgetCalculationService } from './budget-calculation.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { CostCategory, Prisma } from '@prisma/client';

describe('BudgetsService', () => {
  let service: BudgetsService;
  let prisma: {
    project: { findFirst: jest.Mock };
    projectBudget: {
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    costEntry: {
      aggregate: jest.Mock;
      count: jest.Mock;
      create: jest.Mock;
      findMany: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
      groupBy: jest.Mock;
    };
    $queryRaw: jest.Mock;
  };

  const orgId = 'org-uuid-1';
  const projectId = 'proj-uuid-1';
  const userId = 'user-uuid-1';

  beforeEach(async () => {
    prisma = {
      project: { findFirst: jest.fn() },
      projectBudget: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      costEntry: {
        aggregate: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        groupBy: jest.fn(),
      },
      $queryRaw: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BudgetsService,
        BudgetCalculationService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get<BudgetsService>(BudgetsService);
  });

  describe('createBudget', () => {
    it('throws NotFoundException if project not in organization', async () => {
      prisma.project.findFirst.mockResolvedValue(null);

      await expect(
        service.createBudget(orgId, projectId, { totalBudget: 50000 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ConflictException if project budget already exists', async () => {
      prisma.project.findFirst.mockResolvedValue({ id: projectId });
      prisma.projectBudget.findUnique.mockResolvedValue({ id: 'budget-1' });

      await expect(
        service.createBudget(orgId, projectId, { totalBudget: 50000 }),
      ).rejects.toThrow(ConflictException);
    });

    it('creates budget successfully', async () => {
      prisma.project.findFirst.mockResolvedValue({ id: projectId });
      prisma.projectBudget.findUnique.mockResolvedValue(null);
      prisma.projectBudget.create.mockResolvedValue({
        id: 'budget-1',
        projectId,
        totalBudget: new Prisma.Decimal(50000),
        currency: 'USD',
      });
      prisma.costEntry.aggregate.mockResolvedValue({
        _sum: { amount: null },
      });

      const res = await service.createBudget(orgId, projectId, {
        totalBudget: 50000,
        currency: 'USD',
      });

      expect(res.success).toBe(true);
      expect(res.data.totalBudget).toBe(50000);
      expect(res.data.spent).toBe(0);
      expect(res.data.remaining).toBe(50000);
    });
  });

  describe('updateBudget', () => {
    it('throws ConflictException if changing currency when cost entries exist', async () => {
      prisma.project.findFirst.mockResolvedValue({ id: projectId });
      prisma.projectBudget.findUnique.mockResolvedValue({
        id: 'budget-1',
        projectId,
        currency: 'USD',
      });
      prisma.costEntry.count.mockResolvedValue(3); // 3 costs exist

      await expect(
        service.updateBudget(orgId, projectId, { currency: 'EUR' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('addCostEntry', () => {
    it('adds cost entry successfully', async () => {
      prisma.project.findFirst.mockResolvedValue({ id: projectId });
      prisma.costEntry.create.mockResolvedValue({
        id: 'cost-1',
        projectId,
        amount: new Prisma.Decimal(2500),
        category: CostCategory.INFRASTRUCTURE,
        description: 'AWS bill',
        incurredAt: new Date(),
        createdById: userId,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: { id: userId, name: 'Alice' },
      });

      const res = await service.addCostEntry(orgId, projectId, userId, {
        amount: 2500,
        category: CostCategory.INFRASTRUCTURE,
        description: 'AWS bill',
      });

      expect(res.success).toBe(true);
      expect(res.data.amount).toBe(2500);
      expect(res.data.category).toBe(CostCategory.INFRASTRUCTURE);
    });
  });

  describe('getCostBreakdown', () => {
    it('calculates category breakdown percentages properly', async () => {
      prisma.project.findFirst.mockResolvedValue({ id: projectId });
      prisma.costEntry.groupBy.mockResolvedValue([
        {
          category: CostCategory.LABOR,
          _sum: { amount: new Prisma.Decimal(6000) },
        },
        {
          category: CostCategory.SOFTWARE,
          _sum: { amount: new Prisma.Decimal(4000) },
        },
      ]);

      const res = await service.getCostBreakdown(orgId, projectId);
      expect(res.success).toBe(true);
      expect(res.data).toHaveLength(2);
      expect(res.data[0].category).toBe(CostCategory.LABOR);
      expect(res.data[0].amount).toBe(6000);
      expect(res.data[0].percentage).toBe(60);
      expect(res.data[1].category).toBe(CostCategory.SOFTWARE);
      expect(res.data[1].percentage).toBe(40);
    });
  });

  describe('getMonthlyCostSummary', () => {
    it('returns monthly aggregated costs', async () => {
      prisma.project.findFirst.mockResolvedValue({ id: projectId });
      prisma.$queryRaw.mockResolvedValue([
        { month: '2026-09', amount: '4500.00' },
        { month: '2026-10', amount: '8000.50' },
      ]);

      const res = await service.getMonthlyCostSummary(orgId, projectId);
      expect(res.success).toBe(true);
      expect(res.data).toEqual([
        { month: '2026-09', amount: 4500 },
        { month: '2026-10', amount: 8000.5 },
      ]);
    });
  });
});
