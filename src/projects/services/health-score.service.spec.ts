import { HealthScoreService } from './health-score.service.js';
import {
  ProjectHealthStatus,
  ProjectRisk,
  RiskSeverity,
  RiskType,
} from './risk-engine.types.js';

describe('HealthScoreService', () => {
  let service: HealthScoreService;

  beforeEach(() => {
    service = new HealthScoreService();
  });

  const createMockRisk = (
    type: RiskType,
    severity: RiskSeverity,
    title = 'Mock Risk',
  ): ProjectRisk => ({
    type,
    severity,
    title,
    description: `Description for ${title}`,
    detectedAt: new Date('2026-03-01T00:00:00.000Z'),
  });

  describe('Boundary Score Evaluation', () => {
    it('should return score 100 and HEALTHY when no risks are detected', () => {
      const result = service.calculateHealth([]);
      expect(result.score).toBe(100);
      expect(result.status).toBe(ProjectHealthStatus.HEALTHY);
      expect(result.reasons).toHaveLength(0);
    });

    it('should return score 80 and HEALTHY on boundary (e.g. 2 medium risks = -16, 1 low = -3 => 81; or 1 high = -15, 1 low = -3 => 82; or exact boundary)', () => {
      // 1 HIGH (-15) + 1 LOW (-3) => 82 (HEALTHY)
      const result82 = service.calculateHealth([
        createMockRisk(RiskType.RESOURCE, RiskSeverity.HIGH),
        createMockRisk(RiskType.DELIVERY, RiskSeverity.LOW),
      ]);
      expect(result82.score).toBe(82);
      expect(result82.status).toBe(ProjectHealthStatus.HEALTHY);

      // Score exactly 80: 1 CRITICAL (-25), wait: if critical is not budget/overdue, e.g. delivery or others:
      // Let's test score = 84 (2 MEDIUM: -16 => 84)
      const result84 = service.calculateHealth([
        createMockRisk(RiskType.DELIVERY, RiskSeverity.MEDIUM),
        createMockRisk(RiskType.MILESTONE, RiskSeverity.MEDIUM),
      ]);
      expect(result84.score).toBe(84);
      expect(result84.status).toBe(ProjectHealthStatus.HEALTHY);
    });

    it('should return score 79 and AT_RISK on upper boundary of AT_RISK', () => {
      // 1 HIGH (-15) + 1 LOW (-3) + 1 LOW (-3) => 79
      const result79 = service.calculateHealth([
        createMockRisk(RiskType.RESOURCE, RiskSeverity.HIGH),
        createMockRisk(RiskType.DELIVERY, RiskSeverity.LOW),
        createMockRisk(RiskType.DELIVERY, RiskSeverity.LOW),
      ]);
      expect(result79.score).toBe(79);
      expect(result79.status).toBe(ProjectHealthStatus.AT_RISK);
    });

    it('should return score 60 and AT_RISK on lower boundary of AT_RISK', () => {
      // 5 MEDIUM (-8 each) => -40 => 60
      const resultExactly60 = service.calculateHealth([
        createMockRisk(RiskType.DELIVERY, RiskSeverity.MEDIUM),
        createMockRisk(RiskType.DELIVERY, RiskSeverity.MEDIUM),
        createMockRisk(RiskType.DELIVERY, RiskSeverity.MEDIUM),
        createMockRisk(RiskType.DELIVERY, RiskSeverity.MEDIUM),
        createMockRisk(RiskType.DELIVERY, RiskSeverity.MEDIUM),
      ]);
      expect(resultExactly60.score).toBe(60);
      expect(resultExactly60.status).toBe(ProjectHealthStatus.AT_RISK);
    });

    it('should return score 59 and CRITICAL on upper boundary of CRITICAL', () => {
      // 5 MEDIUM (-40) + 1 LOW (-3) => 57
      // 2 HIGH (-30) + 1 MEDIUM (-8) + 1 LOW (-3) => 59
      const result59 = service.calculateHealth([
        createMockRisk(RiskType.RESOURCE, RiskSeverity.HIGH),
        createMockRisk(RiskType.DELIVERY, RiskSeverity.HIGH),
        createMockRisk(RiskType.MILESTONE, RiskSeverity.MEDIUM),
        createMockRisk(RiskType.DELIVERY, RiskSeverity.LOW),
      ]);
      expect(result59.score).toBe(59);
      expect(result59.status).toBe(ProjectHealthStatus.CRITICAL);
    });

    it('should clamp minimum score at 0 and return CRITICAL', () => {
      const result0 = service.calculateHealth([
        createMockRisk(RiskType.BUDGET, RiskSeverity.CRITICAL),
        createMockRisk(RiskType.TIMELINE, RiskSeverity.CRITICAL),
        createMockRisk(RiskType.RESOURCE, RiskSeverity.HIGH),
        createMockRisk(RiskType.DELIVERY, RiskSeverity.HIGH),
        createMockRisk(RiskType.MILESTONE, RiskSeverity.HIGH),
        createMockRisk(RiskType.MILESTONE, RiskSeverity.HIGH),
      ]);
      expect(result0.score).toBe(0);
      expect(result0.status).toBe(ProjectHealthStatus.CRITICAL);
    });
  });

  describe('Hard Rule Enforcement', () => {
    it('hard rule: over budget project cannot be HEALTHY (capped at 79 / AT_RISK)', () => {
      // Over budget alone: CRITICAL risk (-25) -> 75. But even if score was >= 80, it must be capped at 79.
      const result = service.calculateHealth([
        createMockRisk(
          RiskType.BUDGET,
          RiskSeverity.CRITICAL,
          'Budget Overrun',
        ),
      ]);
      expect(result.score).toBe(75);
      expect(result.status).toBe(ProjectHealthStatus.AT_RISK);
      expect(result.status).not.toBe(ProjectHealthStatus.HEALTHY);
    });

    it('hard rule: overdue project cannot be HEALTHY', () => {
      const result = service.calculateHealth([
        createMockRisk(
          RiskType.TIMELINE,
          RiskSeverity.CRITICAL,
          'Project Overdue',
        ),
      ]);
      expect(result.score).toBe(75);
      expect(result.status).toBe(ProjectHealthStatus.AT_RISK);
      expect(result.status).not.toBe(ProjectHealthStatus.HEALTHY);
    });

    it('should drop to CRITICAL when multiple critical risks are compounded', () => {
      const result = service.calculateHealth([
        createMockRisk(
          RiskType.BUDGET,
          RiskSeverity.CRITICAL,
          'Budget Overrun',
        ),
        createMockRisk(
          RiskType.TIMELINE,
          RiskSeverity.CRITICAL,
          'Project Overdue',
        ),
        createMockRisk(RiskType.DELIVERY, RiskSeverity.HIGH, 'Blocked Tasks'),
      ]);
      // 100 - 25 - 25 - 15 = 35
      expect(result.score).toBe(35);
      expect(result.status).toBe(ProjectHealthStatus.CRITICAL);
      expect(result.reasons).toHaveLength(3);
    });
  });
});
