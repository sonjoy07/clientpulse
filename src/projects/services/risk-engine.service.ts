import { Injectable } from '@nestjs/common';
import { RiskType, RiskSeverity, ProjectRisk } from './risk-engine.types.js';

export interface RiskEvaluationInput {
  budgetBurnPercentage?: number;
  timeBurnPercentage?: number;
  isOverdue?: boolean;
  timelineVarianceDays?: number;
  maxMemberAllocation?: number;
  blockedTasksCount?: number;
  overdueMilestonesCount?: number;
  now?: Date;
}

@Injectable()
export class RiskEngineService {
  evaluateRisks(input: RiskEvaluationInput): ProjectRisk[] {
    const risks: ProjectRisk[] = [];
    const now = input.now ?? new Date();

    // 1. Budget Risks
    if (input.budgetBurnPercentage !== undefined) {
      if (input.budgetBurnPercentage > 100) {
        risks.push({
          type: RiskType.BUDGET,
          severity: RiskSeverity.CRITICAL,
          title: 'Budget Overrun',
          description: `Budget consumption (${input.budgetBurnPercentage}%) has exceeded 100% of allocation.`,
          detectedAt: now,
        });
      } else if (
        input.budgetBurnPercentage >= 80 &&
        input.timeBurnPercentage !== undefined &&
        input.budgetBurnPercentage - input.timeBurnPercentage >= 20
      ) {
        risks.push({
          type: RiskType.BUDGET,
          severity: RiskSeverity.HIGH,
          title: 'Accelerated Budget Burn',
          description: `Budget consumption (${input.budgetBurnPercentage}%) significantly outpaces timeline elapsed (${input.timeBurnPercentage}%).`,
          detectedAt: now,
        });
      }
    }

    // 2. Timeline Risks
    if (input.isOverdue) {
      risks.push({
        type: RiskType.TIMELINE,
        severity: RiskSeverity.CRITICAL,
        title: 'Project Overdue',
        description:
          'Target completion date has passed with deliverables pending.',
        detectedAt: now,
      });
    }

    // 3. Resource Risks
    if (
      input.maxMemberAllocation !== undefined &&
      input.maxMemberAllocation > 100
    ) {
      risks.push({
        type: RiskType.RESOURCE,
        severity: RiskSeverity.HIGH,
        title: 'Resource Over-allocation',
        description: `Team member capacity is overallocated at ${input.maxMemberAllocation}%.`,
        detectedAt: now,
      });
    }

    // 4. Delivery Risks (Blocked tasks threshold >= 2 -> HIGH, 1 -> MEDIUM)
    if (input.blockedTasksCount !== undefined && input.blockedTasksCount > 0) {
      if (input.blockedTasksCount >= 2) {
        risks.push({
          type: RiskType.DELIVERY,
          severity: RiskSeverity.HIGH,
          title: 'Critical Delivery Blockers',
          description: `${input.blockedTasksCount} tasks are actively blocked.`,
          detectedAt: now,
        });
      } else {
        risks.push({
          type: RiskType.DELIVERY,
          severity: RiskSeverity.MEDIUM,
          title: 'Task Blocker Detected',
          description: '1 task is actively blocked awaiting resolution.',
          detectedAt: now,
        });
      }
    }

    // 5. Milestone Risks (1 overdue -> MEDIUM, 2+ overdue -> HIGH)
    if (
      input.overdueMilestonesCount !== undefined &&
      input.overdueMilestonesCount > 0
    ) {
      if (input.overdueMilestonesCount >= 2) {
        risks.push({
          type: RiskType.MILESTONE,
          severity: RiskSeverity.HIGH,
          title: 'Multiple Overdue Milestones',
          description: `${input.overdueMilestonesCount} delivery milestones are past their scheduled due dates.`,
          detectedAt: now,
        });
      } else {
        risks.push({
          type: RiskType.MILESTONE,
          severity: RiskSeverity.MEDIUM,
          title: 'Overdue Milestone',
          description: '1 delivery milestone is past its scheduled due date.',
          detectedAt: now,
        });
      }
    }

    return risks;
  }
}
