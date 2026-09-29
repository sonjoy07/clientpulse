import { Test, TestingModule } from '@nestjs/testing';
import { BudgetCalculationService } from './budget-calculation.service.js';
import { BudgetStatus, BurnRateStatus } from './budgets.types.js';

describe('BudgetCalculationService', () => {
  let service: BudgetCalculationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BudgetCalculationService],
    }).compile();

    service = module.get<BudgetCalculationService>(BudgetCalculationService);
  });

  describe('calculateBudgetStatus', () => {
    it('returns NOT_CONFIGURED when hasBudget is false', () => {
      expect(service.calculateBudgetStatus(0, false)).toBe(
        BudgetStatus.NOT_CONFIGURED,
      );
    });

    it('returns UNDER_CONTROL when usedPercentage < 80', () => {
      expect(service.calculateBudgetStatus(79.9, true)).toBe(
        BudgetStatus.UNDER_CONTROL,
      );
    });

    it('returns AT_RISK when usedPercentage is between 80 and 100 inclusive', () => {
      expect(service.calculateBudgetStatus(80, true)).toBe(
        BudgetStatus.AT_RISK,
      );
      expect(service.calculateBudgetStatus(100, true)).toBe(
        BudgetStatus.AT_RISK,
      );
    });

    it('returns OVER_BUDGET when usedPercentage > 100', () => {
      expect(service.calculateBudgetStatus(100.1, true)).toBe(
        BudgetStatus.OVER_BUDGET,
      );
    });
  });

  describe('calculateTimeBurn', () => {
    it('returns 0 when dates are missing', () => {
      expect(service.calculateTimeBurn(null, null)).toBe(0);
      expect(service.calculateTimeBurn(new Date(), null)).toBe(0);
    });

    it('returns 0 when now < startDate (project not started)', () => {
      const futureStart = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
      const futureEnd = new Date(Date.now() + 50 * 24 * 60 * 60 * 1000);
      expect(service.calculateTimeBurn(futureStart, futureEnd)).toBe(0);
    });

    it('returns 100 when now > endDate', () => {
      const pastStart = new Date(Date.now() - 50 * 24 * 60 * 60 * 1000);
      const pastEnd = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
      expect(service.calculateTimeBurn(pastStart, pastEnd)).toBe(100);
    });

    it('calculates elapsed percentage correctly during active project', () => {
      const start = new Date(Date.now() - 50 * 24 * 60 * 60 * 1000);
      const end = new Date(Date.now() + 50 * 24 * 60 * 60 * 1000);
      // 50 elapsed out of 100 days total = 50%
      expect(service.calculateTimeBurn(start, end)).toBe(50);
    });

    it('handles zero or negative duration safely by returning 100', () => {
      const d = new Date();
      expect(service.calculateTimeBurn(d, d)).toBe(100);
    });
  });

  describe('calculateBurnRate', () => {
    it('returns ON_TRACK when budgetBurn <= timeBurn + 10', () => {
      const res = service.calculateBurnRate(55, 50, false);
      expect(res.status).toBe(BurnRateStatus.ON_TRACK);
      expect(res.difference).toBe(5);
    });

    it('returns BURNING_FAST when budgetBurn > timeBurn + 10 and <= timeBurn + 25', () => {
      const res = service.calculateBurnRate(65, 50, false);
      expect(res.status).toBe(BurnRateStatus.BURNING_FAST);
      expect(res.difference).toBe(15);
    });

    it('returns CRITICAL when budgetBurn > timeBurn + 25', () => {
      const res = service.calculateBurnRate(80, 50, false);
      expect(res.status).toBe(BurnRateStatus.CRITICAL);
      expect(res.difference).toBe(30);
    });

    it('returns CRITICAL immediately when project is over budget', () => {
      const res = service.calculateBurnRate(110, 95, true);
      expect(res.status).toBe(BurnRateStatus.CRITICAL);
    });
  });

  describe('calculateSummary', () => {
    it('handles normal spending scenario', () => {
      const start = new Date(Date.now() - 50 * 24 * 60 * 60 * 1000);
      const end = new Date(Date.now() + 50 * 24 * 60 * 60 * 1000);
      const summary = service.calculateSummary(50000, 'USD', 32500, start, end);

      expect(summary.budget.total).toBe(50000);
      expect(summary.budget.spent).toBe(32500);
      expect(summary.budget.remaining).toBe(17500);
      expect(summary.budget.usedPercentage).toBe(65);
      expect(summary.budget.status).toBe(BudgetStatus.UNDER_CONTROL);
      expect(summary.timeline.timeBurnPercentage).toBe(50);
      expect(summary.burnRate.status).toBe(BurnRateStatus.BURNING_FAST);
      expect(summary.burnRate.difference).toBe(15);
    });

    it('handles over budget scenario with actual percentage > 100', () => {
      const summary = service.calculateSummary(50000, 'USD', 55000, null, null);
      expect(summary.budget.spent).toBe(55000);
      expect(summary.budget.remaining).toBe(-5000);
      expect(summary.budget.usedPercentage).toBe(110);
      expect(summary.budget.status).toBe(BudgetStatus.OVER_BUDGET);
      expect(summary.burnRate.status).toBe(BurnRateStatus.CRITICAL);
    });

    it('handles zero budget scenario (NOT_CONFIGURED)', () => {
      const summary = service.calculateSummary(null, 'USD', 1000, null, null);
      expect(summary.budget.total).toBe(0);
      expect(summary.budget.status).toBe(BudgetStatus.NOT_CONFIGURED);
    });
  });
});
