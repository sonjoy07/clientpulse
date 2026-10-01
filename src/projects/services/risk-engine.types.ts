export enum RiskType {
  BUDGET = 'BUDGET',
  TIMELINE = 'TIMELINE',
  RESOURCE = 'RESOURCE',
  DELIVERY = 'DELIVERY',
  MILESTONE = 'MILESTONE',
}

export enum RiskSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export interface ProjectRisk {
  type: RiskType;
  severity: RiskSeverity;
  title: string;
  description: string;
  detectedAt: Date;
}

export enum ProjectHealthStatus {
  HEALTHY = 'HEALTHY',
  AT_RISK = 'AT_RISK',
  CRITICAL = 'CRITICAL',
}

export interface ProjectHealthResult {
  score: number;
  status: ProjectHealthStatus;
  reasons: string[];
  risks: ProjectRisk[];
}
