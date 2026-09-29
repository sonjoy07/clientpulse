import { CostCategory } from '@prisma/client';

export enum BudgetStatus {
  NOT_CONFIGURED = 'NOT_CONFIGURED',
  UNDER_CONTROL = 'UNDER_CONTROL',
  AT_RISK = 'AT_RISK',
  OVER_BUDGET = 'OVER_BUDGET',
}

export enum BurnRateStatus {
  ON_TRACK = 'ON_TRACK',
  BURNING_FAST = 'BURNING_FAST',
  CRITICAL = 'CRITICAL',
}

export interface BudgetResponse {
  projectId: string;
  totalBudget: number;
  currency: string;
  spent: number;
  remaining: number;
  budgetUsedPercentage: number;
}

export interface BudgetSummary {
  budget: {
    total: number;
    spent: number;
    remaining: number;
    usedPercentage: number;
    currency: string;
    status: BudgetStatus;
  };
  timeline: {
    timeBurnPercentage: number;
  };
  burnRate: {
    budgetBurnPercentage: number;
    timeBurnPercentage: number;
    difference: number;
    status: BurnRateStatus;
  };
}

export interface CostBreakdownItem {
  category: CostCategory;
  amount: number;
  percentage: number;
}

export interface MonthlyCostItem {
  month: string;
  amount: number;
}
