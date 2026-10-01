import { RiskEngineService } from './risk-engine.service.js';
import { RiskSeverity, RiskType } from './risk-engine.types.js';

describe('RiskEngineService', () => {
  let service: RiskEngineService;

  beforeEach(() => {
    service = new RiskEngineService();
  });

  describe('Budget Risk Evaluation', () => {
    it('should generate CRITICAL risk when budget burn exceeds 100%', () => {
      const risks = service.evaluateRisks({
        budgetBurnPercentage: 115,
        timeBurnPercentage: 80,
      });

      const budgetRisk = risks.find((r) => r.type === RiskType.BUDGET);
      expect(budgetRisk).toBeDefined();
      expect(budgetRisk!.severity).toBe(RiskSeverity.CRITICAL);
      expect(budgetRisk!.title).toBe('Budget Overrun');
      expect(budgetRisk!.description).toContain('115%');
      expect(budgetRisk!.detectedAt).toBeInstanceOf(Date);
    });

    it('should generate HIGH risk when budget burn is >= 80% and outpaces timeline burn by >= 20%', () => {
      const risks = service.evaluateRisks({
        budgetBurnPercentage: 85,
        timeBurnPercentage: 60,
      });

      const budgetRisk = risks.find((r) => r.type === RiskType.BUDGET);
      expect(budgetRisk).toBeDefined();
      expect(budgetRisk!.severity).toBe(RiskSeverity.HIGH);
      expect(budgetRisk!.title).toBe('Accelerated Budget Burn');
      expect(budgetRisk!.description).toContain('85%');
      expect(budgetRisk!.description).toContain('60%');
    });

    it('should not generate budget risk when budget burn is healthy and on track', () => {
      const risks = service.evaluateRisks({
        budgetBurnPercentage: 50,
        timeBurnPercentage: 50,
      });

      const budgetRisk = risks.find((r) => r.type === RiskType.BUDGET);
      expect(budgetRisk).toBeUndefined();
    });
  });

  describe('Timeline Risk Evaluation', () => {
    it('should generate CRITICAL risk when project is overdue', () => {
      const risks = service.evaluateRisks({
        isOverdue: true,
      });

      const timelineRisk = risks.find((r) => r.type === RiskType.TIMELINE);
      expect(timelineRisk).toBeDefined();
      expect(timelineRisk!.severity).toBe(RiskSeverity.CRITICAL);
      expect(timelineRisk!.title).toBe('Project Overdue');
    });

    it('should not generate timeline risk when project is not overdue', () => {
      const risks = service.evaluateRisks({
        isOverdue: false,
      });

      const timelineRisk = risks.find((r) => r.type === RiskType.TIMELINE);
      expect(timelineRisk).toBeUndefined();
    });
  });

  describe('Resource Allocation Risk Evaluation', () => {
    it('should generate HIGH risk when a team member is overallocated (>100%)', () => {
      const risks = service.evaluateRisks({
        maxMemberAllocation: 130,
      });

      const resourceRisk = risks.find((r) => r.type === RiskType.RESOURCE);
      expect(resourceRisk).toBeDefined();
      expect(resourceRisk!.severity).toBe(RiskSeverity.HIGH);
      expect(resourceRisk!.title).toBe('Resource Over-allocation');
      expect(resourceRisk!.description).toContain('130%');
    });

    it('should not generate resource risk when allocation is <= 100%', () => {
      const risks = service.evaluateRisks({
        maxMemberAllocation: 100,
      });

      const resourceRisk = risks.find((r) => r.type === RiskType.RESOURCE);
      expect(resourceRisk).toBeUndefined();
    });
  });

  describe('Delivery Blocker Risk Evaluation', () => {
    it('should generate HIGH risk when multiple tasks are blocked (>= 2)', () => {
      const risks = service.evaluateRisks({
        blockedTasksCount: 3,
      });

      const deliveryRisk = risks.find((r) => r.type === RiskType.DELIVERY);
      expect(deliveryRisk).toBeDefined();
      expect(deliveryRisk!.severity).toBe(RiskSeverity.HIGH);
      expect(deliveryRisk!.title).toBe('Critical Delivery Blockers');
      expect(deliveryRisk!.description).toContain(
        '3 tasks are actively blocked',
      );
    });

    it('should generate MEDIUM risk when exactly 1 task is blocked', () => {
      const risks = service.evaluateRisks({
        blockedTasksCount: 1,
      });

      const deliveryRisk = risks.find((r) => r.type === RiskType.DELIVERY);
      expect(deliveryRisk).toBeDefined();
      expect(deliveryRisk!.severity).toBe(RiskSeverity.MEDIUM);
      expect(deliveryRisk!.title).toBe('Task Blocker Detected');
    });

    it('should not generate delivery risk when 0 tasks are blocked', () => {
      const risks = service.evaluateRisks({
        blockedTasksCount: 0,
      });

      const deliveryRisk = risks.find((r) => r.type === RiskType.DELIVERY);
      expect(deliveryRisk).toBeUndefined();
    });
  });

  describe('Milestone Risk Evaluation', () => {
    it('should generate MEDIUM risk when 1 milestone is overdue', () => {
      const risks = service.evaluateRisks({
        overdueMilestonesCount: 1,
      });

      const milestoneRisk = risks.find((r) => r.type === RiskType.MILESTONE);
      expect(milestoneRisk).toBeDefined();
      expect(milestoneRisk!.severity).toBe(RiskSeverity.MEDIUM);
      expect(milestoneRisk!.title).toBe('Overdue Milestone');
    });

    it('should generate HIGH risk when 2 or more milestones are overdue', () => {
      const risks = service.evaluateRisks({
        overdueMilestonesCount: 3,
      });

      const milestoneRisk = risks.find((r) => r.type === RiskType.MILESTONE);
      expect(milestoneRisk).toBeDefined();
      expect(milestoneRisk!.severity).toBe(RiskSeverity.HIGH);
      expect(milestoneRisk!.title).toBe('Multiple Overdue Milestones');
    });

    it('should not generate milestone risk when 0 milestones are overdue', () => {
      const risks = service.evaluateRisks({
        overdueMilestonesCount: 0,
      });

      const milestoneRisk = risks.find((r) => r.type === RiskType.MILESTONE);
      expect(milestoneRisk).toBeUndefined();
    });
  });
});
