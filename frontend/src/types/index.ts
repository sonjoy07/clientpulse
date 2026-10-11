export type Role =
  | 'SUPER_ADMIN'
  | 'ADMIN'
  | 'PROJECT_MANAGER'
  | 'TEAM_LEAD'
  | 'TEAM_MEMBER'
  | 'CLIENT';

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  organizationId: string;
  clientId?: string | null;
}

export interface LoginResponse {
  user: AuthenticatedUser;
  accessToken: string;
  refreshToken: string;
}

export interface RefreshResponse {
  accessToken: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  meta?: PaginationMeta;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  meta: PaginationMeta;
}

// Client
export interface Client {
  id: string;
  organizationId: string;
  name: string;
  companyName?: string | null;
  email: string;
  phone?: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: {
    projects: number;
    users: number;
  };
}

// Project
export type ProjectStatus =
  | 'PLANNING'
  | 'ACTIVE'
  | 'ON_HOLD'
  | 'COMPLETED'
  | 'CANCELLED';

export interface Project {
  id: string;
  organizationId: string;
  clientId: string;
  name: string;
  description?: string | null;
  status: ProjectStatus;
  startDate?: string | null;
  endDate?: string | null;
  createdAt: string;
  updatedAt: string;
  client?: {
    id: string;
    name?: string;
    companyName?: string | null;
  };
  _count?: {
    projectMembers: number;
    milestones: number;
    tasks: number;
  };
}

// Timeline & Delivery Summary
export type TimelineStatus =
  | 'NOT_STARTED'
  | 'ON_TRACK'
  | 'AT_RISK'
  | 'CRITICAL'
  | 'COMPLETED';

export interface DeliverySummary {
  projectId: string;
  projectName: string;
  progress: number;
  tasks: {
    total: number;
    todo: number;
    inProgress: number;
    blocked: number;
    done: number;
  };
  milestones: {
    total: number;
    completed: number;
    inProgress: number;
    blocked: number;
    pending: number;
  };
  timeline: {
    status: TimelineStatus;
    expectedProgress: number;
    actualProgress: number;
  };
}

// Risks & Health
export type RiskType = 'BUDGET' | 'TIMELINE' | 'RESOURCE' | 'DELIVERY' | 'MILESTONE';
export type RiskSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type ProjectHealthStatus = 'HEALTHY' | 'AT_RISK' | 'CRITICAL';

export interface ProjectRisk {
  type: RiskType;
  severity: RiskSeverity;
  title: string;
  description: string;
  detectedAt: string;
}

export interface ProjectHealthResult {
  score: number;
  status: ProjectHealthStatus;
  reasons: string[];
  risks: ProjectRisk[];
}

// Project Member
export interface ProjectMember {
  id: string;
  projectId: string;
  userId: string;
  allocationPercentage: number;
  projectRole: string;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: Role;
  };
}

// Tasks
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'BLOCKED' | 'DONE';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface Task {
  id: string;
  projectId: string;
  milestoneId?: string | null;
  assigneeId?: string | null;
  title: string;
  description?: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: string | null;
  createdAt: string;
  updatedAt: string;
  assignee?: {
    id: string;
    name: string;
    email: string;
  } | null;
  milestone?: {
    id: string;
    name: string;
  } | null;
}

// Milestones
export type MilestoneStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'BLOCKED';

export interface Milestone {
  id: string;
  projectId: string;
  name: string;
  description?: string | null;
  status: MilestoneStatus;
  dueDate: string;
  createdAt: string;
  updatedAt: string;
  _count?: {
    tasks: number;
  };
}

// Budget & Costs
export interface ProjectBudget {
  id: string;
  projectId: string;
  totalBudget: number;
  currency: string;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BudgetSummary {
  projectId: string;
  totalBudget: number;
  totalSpent: number;
  remainingBudget: number;
  currency: string;
  utilizationPercentage: number;
  burnRateStatus: 'NORMAL' | 'WARNING' | 'OVER_BUDGET';
  timeBurnPercentage?: number;
}

export interface CostEntry {
  id: string;
  projectId: string;
  amount: number;
  category: string;
  description?: string | null;
  incurredAt: string;
  createdAt: string;
  updatedAt: string;
}

// Resources & Allocation
export interface UserResourceProfile {
  userId?: string;
  name?: string;
  email?: string;
  role?: Role;
  user?: {
    id: string;
    name: string;
    email: string;
    role: Role;
  };
  totalAllocation?: number;
  totalAllocationPercentage?: number;
  availableCapacity?: number;
  availableCapacityPercentage?: number;
  overallocatedBy?: number;
  status?: 'AVAILABLE' | 'FULL' | 'OVERALLOCATED';
  allocationStatus?: 'AVAILABLE' | 'FULL' | 'OVERALLOCATED';
  allocations?: Array<{
    projectId: string;
    projectName: string;
    allocationPercentage: number;
    projectRole?: string;
  }>;
  projects?: Array<{
    projectId: string;
    projectName: string;
    allocationPercentage: number;
    projectRole?: string;
  }>;
}

export interface ResourceOverviewSummary {
  totalResources?: number;
  totalTeamMembers?: number;
  averageAllocation?: number;
  averageUtilizationPercentage?: number;
  available?: number;
  availableMembers?: number;
  availableCount?: number;
  full?: number;
  fullyAllocatedMembers?: number;
  fullCount?: number;
  overallocated?: number;
  overallocatedMembers?: number;
  overallocatedCount?: number;
}

// AI Reports
export type AIReportStatus = 'PENDING' | 'GENERATING' | 'COMPLETED' | 'FAILED';

export interface AIReportContent {
  summary: string;
  highlights: string[];
  achievements: string[];
  blockersAndConcerns: string[];
  nextSteps: string[];
  overallProgressCommentary?: string;
}

export interface AIReport {
  id: string;
  projectId: string;
  periodStart: string;
  periodEnd: string;
  status: AIReportStatus;
  reportContent?: AIReportContent | null;
  error?: string | null;
  createdAt: string;
  updatedAt: string;
}

// Client Portal
export interface ClientPortalDashboard {
  client: {
    id: string;
    name: string;
    companyName?: string | null;
  };
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  projects: Array<{
    id: string;
    name: string;
    status: ProjectStatus;
    progress: number;
    startDate?: string | null;
    endDate?: string | null;
  }>;
}
