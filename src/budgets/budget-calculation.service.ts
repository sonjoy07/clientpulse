import { Injectable } from '@nestjs/common';
import {
  BudgetStatus,
  BurnRateStatus,
  BudgetSummary,
} from './budgets.types.js';

export const BUDGET_THRESHOLDS = {
  UNDER_CONTROL_LIMIT: 80,
  OVER_BUDGET_LIMIT: 100,
  BURN_RATE_ON_TRACK_DIFF: 10,
  BURN_RATE_BURNING_FAST_DIFF: 25,
};

@Injectable()
export class BudgetCalculationService {
  calculateBudgetStatus(
    budgetUsedPercentage: number,
    hasBudget: boolean,
  ): BudgetStatus {
    if (!hasBudget) {
      return BudgetStatus.NOT_CONFIGURED;
    }
    if (budgetUsedPercentage < BUDGET_THRESHOLDS.UNDER_CONTROL_LIMIT) {
      return BudgetStatus.UNDER_CONTROL;
    }
    if (budgetUsedPercentage <= BUDGET_THRESHOLDS.OVER_BUDGET_LIMIT) {
      return BudgetStatus.AT_RISK;
    }
    return BudgetStatus.OVER_BUDGET;
  }

  calculateTimeBurn(
    startDate: Date | null,
    endDate: Date | null,
    now: Date = new Date(),
  ): number {
    if (!startDate || !endDate) {
      return 0;
    }

    if (now < startDate) {
      return 0;
    }

    const totalDuration = endDate.getTime() - startDate.getTime();
    if (totalDuration <= 0) {
      return 100;
    }

    if (now > endDate) {
      return 100;
    }

    const elapsed = now.getTime() - startDate.getTime();
    return Math.round(
      Math.min(100, Math.max(0, (elapsed / totalDuration) * 100)),
    );
  }

  calculateBurnRate(
    budgetBurnPercentage: number,
    timeBurnPercentage: number,
    isOverBudget: boolean,
  ): { difference: number; status: BurnRateStatus } {
    const rawDiff = budgetBurnPercentage - timeBurnPercentage;
    const difference = Math.round(rawDiff * 100) / 100;

    if (isOverBudget) {
      return {
        difference,
        status: BurnRateStatus.CRITICAL,
      };
    }

    if (
      budgetBurnPercentage <=
      timeBurnPercentage + BUDGET_THRESHOLDS.BURN_RATE_ON_TRACK_DIFF
    ) {
      return {
        difference,
        status: BurnRateStatus.ON_TRACK,
      };
    }

    if (
      budgetBurnPercentage <=
      timeBurnPercentage + BUDGET_THRESHOLDS.BURN_RATE_BURNING_FAST_DIFF
    ) {
      return {
        difference,
        status: BurnRateStatus.BURNING_FAST,
      };
    }

    return {
      difference,
      status: BurnRateStatus.CRITICAL,
    };
  }

  calculateSummary(
    totalBudget: number | null,
    currency: string,
    spent: number,
    startDate: Date | null,
    endDate: Date | null,
    now: Date = new Date(),
  ): BudgetSummary {
    const hasBudget = totalBudget !== null && totalBudget > 0;
    const total = hasBudget ? totalBudget : 0;
    const remaining = hasBudget ? Math.round((total - spent) * 100) / 100 : 0;

    const usedPercentage = hasBudget
      ? Math.round((spent / total) * 10000) / 100
      : 0;

    const budgetStatus = this.calculateBudgetStatus(usedPercentage, hasBudget);
    const timeBurnPercentage = this.calculateTimeBurn(startDate, endDate, now);

    const isOverBudget = hasBudget && spent > total;
    const burnRate = this.calculateBurnRate(
      usedPercentage,
      timeBurnPercentage,
      isOverBudget,
    );

    return {
      budget: {
        total,
        spent: Math.round(spent * 100) / 100,
        remaining,
        usedPercentage,
        currency,
        status: budgetStatus,
      },
      timeline: {
        timeBurnPercentage,
      },
      burnRate: {
        budgetBurnPercentage: usedPercentage,
        timeBurnPercentage,
        difference: burnRate.difference,
        status: burnRate.status,
      },
    };
  }
}
