import { Injectable } from '@nestjs/common';
import {
  ProjectRisk,
  RiskSeverity,
  RiskType,
  ProjectHealthStatus,
  ProjectHealthResult,
} from './risk-engine.types.js';

@Injectable()
export class HealthScoreService {
  calculateHealth(risks: ProjectRisk[]): ProjectHealthResult {
    let score = 100;
    const reasons: string[] = [];

    let isOverBudget = false;
    let isOverdue = false;

    for (const risk of risks) {
      reasons.push(`${risk.severity}: ${risk.title} - ${risk.description}`);

      if (
        risk.type === RiskType.BUDGET &&
        risk.severity === RiskSeverity.CRITICAL
      ) {
        isOverBudget = true;
      }
      if (
        risk.type === RiskType.TIMELINE &&
        risk.severity === RiskSeverity.CRITICAL
      ) {
        isOverdue = true;
      }

      switch (risk.severity) {
        case RiskSeverity.CRITICAL:
          score -= 25;
          break;
        case RiskSeverity.HIGH:
          score -= 15;
          break;
        case RiskSeverity.MEDIUM:
          score -= 8;
          break;
        case RiskSeverity.LOW:
          score -= 3;
          break;
      }
    }

    // Clamp between 0 and 100
    score = Math.max(0, Math.min(100, score));

    // Hard rules: Over budget or overdue cannot be HEALTHY (capped at 79)
    if ((isOverBudget || isOverdue) && score >= 80) {
      score = 79;
    }

    // Determine status based on boundaries:
    // 80 - 100: HEALTHY
    // 60 - 79:  AT_RISK
    // 0 - 59:   CRITICAL
    let status: ProjectHealthStatus;
    if (score >= 80) {
      status = ProjectHealthStatus.HEALTHY;
    } else if (score >= 60) {
      status = ProjectHealthStatus.AT_RISK;
    } else {
      status = ProjectHealthStatus.CRITICAL;
    }

    return {
      score,
      status,
      reasons,
      risks,
    };
  }
}
