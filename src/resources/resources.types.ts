export enum AllocationStatus {
  AVAILABLE = 'AVAILABLE',
  FULL = 'FULL',
  OVERALLOCATED = 'OVERALLOCATED',
}

export enum ProjectCapacityStatus {
  UNDERSTAFFED = 'UNDERSTAFFED',
  BALANCED = 'BALANCED',
  HIGH_UTILIZATION = 'HIGH_UTILIZATION',
}

export const RESOURCE_POLICY = {
  FULL_CAPACITY_PERCENTAGE: 100,
  FULL_CAPACITY: 100,
  OVERALLOCATION_THRESHOLD: 100,
  AVAILABLE_THRESHOLD: 90,
  PROJECT_UNDERSTAFFED_THRESHOLD: 50,
  PROJECT_HIGH_UTILIZATION_THRESHOLD: 90,
} as const;

export const ALLOCATION_THRESHOLDS = {
  FULL_MIN: 90,
  FULL_MAX: 100,
} as const;

export function calculateAllocationStatus(
  totalAllocation: number,
): AllocationStatus {
  if (totalAllocation > RESOURCE_POLICY.FULL_CAPACITY) {
    return AllocationStatus.OVERALLOCATED;
  }
  if (totalAllocation >= RESOURCE_POLICY.AVAILABLE_THRESHOLD) {
    return AllocationStatus.FULL;
  }
  return AllocationStatus.AVAILABLE;
}

export function calculateProjectCapacityStatus(
  averageAllocation: number,
): ProjectCapacityStatus {
  if (averageAllocation > RESOURCE_POLICY.PROJECT_HIGH_UTILIZATION_THRESHOLD) {
    return ProjectCapacityStatus.HIGH_UTILIZATION;
  }
  if (averageAllocation >= RESOURCE_POLICY.PROJECT_UNDERSTAFFED_THRESHOLD) {
    return ProjectCapacityStatus.BALANCED;
  }
  return ProjectCapacityStatus.UNDERSTAFFED;
}

export class ResourceAllocationCalculator {
  static calculateTotalAllocation(percentages: number[]): number {
    return percentages.reduce((sum, p) => sum + (Number(p) || 0), 0);
  }

  static calculateAvailableCapacity(totalAllocation: number): number {
    return Math.max(0, RESOURCE_POLICY.FULL_CAPACITY - totalAllocation);
  }

  static calculateOverallocatedBy(totalAllocation: number): number {
    return Math.max(
      0,
      totalAllocation - RESOURCE_POLICY.OVERALLOCATION_THRESHOLD,
    );
  }

  static getResourceStatus(totalAllocation: number): AllocationStatus {
    return calculateAllocationStatus(totalAllocation);
  }

  static calculateProjectCapacityStatus(
    averageAllocation: number,
  ): ProjectCapacityStatus {
    return calculateProjectCapacityStatus(averageAllocation);
  }
}

export interface UserProjectAllocation {
  projectId: string;
  projectName: string;
  allocationPercentage: number;
}

export interface UserResourceProfile {
  userId?: string;
  name?: string;
  role?: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  projects: UserProjectAllocation[];
  allocations: UserProjectAllocation[];
  totalAllocation: number;
  availableCapacity: number;
  overallocatedBy: number;
  status: AllocationStatus;
}

export interface ResourceOverviewSummary {
  totalResources: number;
  averageAllocation: number;
  available: number;
  full: number;
  overallocated: number;
  availableCount: number;
  fullCount: number;
  overallocatedCount: number;
}

export interface OverallocatedResourceItem {
  userId: string;
  name: string;
  role?: string;
  status: AllocationStatus;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  totalAllocation: number;
  overallocatedBy: number;
  projectCount: number;
  projects: UserProjectAllocation[];
}

export interface AvailableResourceItem {
  userId: string;
  name: string;
  role?: string;
  status: AllocationStatus;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  totalAllocation: number;
  availableCapacity: number;
  projectCount: number;
  projects: UserProjectAllocation[];
}

export interface ResourceUtilizationSummary {
  totalResources: number;
  totalAllocatedCapacity: number;
  availableCapacity: number;
  averageAllocation: number;
  availableResources: number;
  fullyAllocatedResources: number;
  overallocatedResources: number;
}

export interface ResourceDistributionCategory {
  count: number;
  percentage: number;
}

export interface ResourceDistributionSummary {
  AVAILABLE: number;
  FULL: number;
  OVERALLOCATED: number;
  total: number;
  available: ResourceDistributionCategory;
  full: ResourceDistributionCategory;
  overallocated: ResourceDistributionCategory;
}

export interface ProjectResourceRankingItem {
  projectId: string;
  projectName: string;
  projectStatus: string;
  memberCount: number;
  totalAllocation: number;
  averageMemberAllocation: number;
}

export interface ProjectMemberResourceDetail {
  userId: string;
  name: string;
  email: string;
  role: string;
  allocationPercentage: number;
  totalUserAllocation: number;
  userStatus: AllocationStatus;
}

export interface ProjectResourceSummary {
  projectId: string;
  projectName: string;
  projectStatus: string;
  totalMembers: number;
  totalAllocation: number;
  averageAllocation: number;
  capacityStatus: ProjectCapacityStatus;
  members: ProjectMemberResourceDetail[];
}
