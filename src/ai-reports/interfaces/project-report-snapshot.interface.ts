export interface ProjectDeliverySnapshot {
  progressPercentage: number;
  tasks: {
    total: number;
    completed: number;
    inProgress: number;
    blocked: number;
    todo: number;
  };
}

export interface ProjectMilestoneItemSnapshot {
  name: string;
  status: string;
  dueDate: string | null;
}

export interface ProjectMilestonesSnapshot {
  total: number;
  completed: number;
  inProgress: number;
  blocked: number;
  pending: number;
  milestones: ProjectMilestoneItemSnapshot[];
}

export interface ProjectBudgetSnapshot {
  hasBudget: boolean;
  totalBudget?: number;
  spent?: number;
  remaining?: number;
  currency?: string;
  utilizationPercentage?: number;
  burnRateStatus?: string;
}

export interface ProjectTimelineSnapshot {
  status: string;
  startDate: string | null;
  endDate: string | null;
  isDelayed: boolean;
}

export interface ProjectReportSnapshot {
  projectId: string;
  projectName: string;
  clientName: string;
  period: {
    startDate: string;
    endDate: string;
  };
  delivery: ProjectDeliverySnapshot;
  milestones: ProjectMilestonesSnapshot;
  budget: ProjectBudgetSnapshot;
  timeline: ProjectTimelineSnapshot;
  blockers: string[];
}
