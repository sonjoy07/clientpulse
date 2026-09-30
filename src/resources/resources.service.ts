import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  UserResourceProfile,
  UserProjectAllocation,
  ResourceOverviewSummary,
  OverallocatedResourceItem,
  AvailableResourceItem,
  ResourceUtilizationSummary,
  ResourceDistributionSummary,
  ProjectResourceRankingItem,
  ProjectResourceSummary,
  ProjectMemberResourceDetail,
  AllocationStatus,
  RESOURCE_POLICY,
  ResourceAllocationCalculator,
} from './resources.types.js';
import { ListResourceOverviewQueryDto } from './dto/list-resource-overview-query.dto.js';
import { PaginatedResponse } from '../common/interfaces/paginated-response.interface.js';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator.js';

export interface ResourceOverviewResponse extends PaginatedResponse<UserResourceProfile> {
  summary: ResourceOverviewSummary;
}

@Injectable()
export class ResourcesService {
  constructor(private readonly prisma: PrismaService) {}

  async getUserResource(
    organizationId: string,
    userId: string,
    currentUser?: AuthenticatedUser,
  ): Promise<{ success: boolean; data: UserResourceProfile }> {
    if (currentUser) {
      if (currentUser.role === Role.CLIENT) {
        throw new ForbiddenException(
          'Access denied: clients cannot view internal resources',
        );
      }
      if (currentUser.role === Role.TEAM_MEMBER && currentUser.id !== userId) {
        throw new ForbiddenException(
          'Team members can only view their own resource profile',
        );
      }
    }

    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        organizationId,
        role: { not: Role.CLIENT },
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        projectMemberships: {
          select: {
            allocationPercentage: true,
            project: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const projects: UserProjectAllocation[] = user.projectMemberships.map(
      (pm) => ({
        projectId: pm.project.id,
        projectName: pm.project.name,
        allocationPercentage: pm.allocationPercentage,
      }),
    );

    const totalAllocation =
      ResourceAllocationCalculator.calculateTotalAllocation(
        projects.map((p) => p.allocationPercentage),
      );
    const availableCapacity =
      ResourceAllocationCalculator.calculateAvailableCapacity(totalAllocation);
    const overallocatedBy =
      ResourceAllocationCalculator.calculateOverallocatedBy(totalAllocation);
    const status =
      ResourceAllocationCalculator.getResourceStatus(totalAllocation);

    return {
      success: true,
      data: {
        userId: user.id,
        name: user.name,
        role: user.role,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
        projects,
        allocations: projects,
        totalAllocation,
        availableCapacity,
        overallocatedBy,
        status,
      },
    };
  }

  async getOverview(
    organizationId: string,
    query: ListResourceOverviewQueryDto,
  ): Promise<ResourceOverviewResponse> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));

    if (query.role === Role.CLIENT) {
      return {
        success: true,
        summary: {
          totalResources: 0,
          averageAllocation: 0,
          available: 0,
          full: 0,
          overallocated: 0,
          availableCount: 0,
          fullCount: 0,
          overallocatedCount: 0,
        },
        data: [],
        meta: {
          page,
          limit,
          total: 0,
          totalPages: 1,
        },
      };
    }

    const where: Prisma.UserWhereInput = {
      organizationId,
      role: query.role ? query.role : { not: Role.CLIENT },
    };

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const users = await this.prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        projectMemberships: {
          select: {
            allocationPercentage: true,
            project: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    const allProfiles: UserResourceProfile[] = users.map((user) => {
      const projects: UserProjectAllocation[] = user.projectMemberships.map(
        (pm) => ({
          projectId: pm.project.id,
          projectName: pm.project.name,
          allocationPercentage: pm.allocationPercentage,
        }),
      );

      const totalAllocation =
        ResourceAllocationCalculator.calculateTotalAllocation(
          projects.map((p) => p.allocationPercentage),
        );
      const availableCapacity =
        ResourceAllocationCalculator.calculateAvailableCapacity(
          totalAllocation,
        );
      const overallocatedBy =
        ResourceAllocationCalculator.calculateOverallocatedBy(totalAllocation);
      const status =
        ResourceAllocationCalculator.getResourceStatus(totalAllocation);

      return {
        userId: user.id,
        name: user.name,
        role: user.role,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
        projects,
        allocations: projects,
        totalAllocation,
        availableCapacity,
        overallocatedBy,
        status,
      };
    });

    const totalResources = allProfiles.length;
    const totalAllocated = allProfiles.reduce(
      (sum, p) => sum + p.totalAllocation,
      0,
    );
    const averageAllocation =
      totalResources > 0
        ? Math.round((totalAllocated / totalResources) * 100) / 100
        : 0;
    const availableCount = allProfiles.filter(
      (p) => p.status === AllocationStatus.AVAILABLE,
    ).length;
    const fullCount = allProfiles.filter(
      (p) => p.status === AllocationStatus.FULL,
    ).length;
    const overallocatedCount = allProfiles.filter(
      (p) => p.status === AllocationStatus.OVERALLOCATED,
    ).length;

    let filteredProfiles = allProfiles;
    if (query.status) {
      filteredProfiles = filteredProfiles.filter(
        (p) => p.status === query.status,
      );
    }
    if (query.minAllocation !== undefined && query.minAllocation !== null) {
      filteredProfiles = filteredProfiles.filter(
        (p) => p.totalAllocation >= query.minAllocation!,
      );
    }
    if (query.maxAllocation !== undefined && query.maxAllocation !== null) {
      filteredProfiles = filteredProfiles.filter(
        (p) => p.totalAllocation <= query.maxAllocation!,
      );
    }

    const total = filteredProfiles.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const paginatedItems = filteredProfiles.slice(
      (page - 1) * limit,
      page * limit,
    );

    return {
      success: true,
      summary: {
        totalResources,
        averageAllocation,
        available: availableCount,
        full: fullCount,
        overallocated: overallocatedCount,
        availableCount,
        fullCount,
        overallocatedCount,
      },
      data: paginatedItems,
      meta: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  async getOverallocated(
    organizationId: string,
  ): Promise<{ success: boolean; data: OverallocatedResourceItem[] }> {
    const users = await this.prisma.user.findMany({
      where: {
        organizationId,
        role: { not: Role.CLIENT },
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        projectMemberships: {
          select: {
            allocationPercentage: true,
            project: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    const overallocated: OverallocatedResourceItem[] = [];

    for (const user of users) {
      const projects: UserProjectAllocation[] = user.projectMemberships.map(
        (pm) => ({
          projectId: pm.project.id,
          projectName: pm.project.name,
          allocationPercentage: pm.allocationPercentage,
        }),
      );

      const totalAllocation =
        ResourceAllocationCalculator.calculateTotalAllocation(
          projects.map((p) => p.allocationPercentage),
        );

      if (totalAllocation > RESOURCE_POLICY.OVERALLOCATION_THRESHOLD) {
        overallocated.push({
          userId: user.id,
          name: user.name,
          role: user.role,
          status: AllocationStatus.OVERALLOCATED,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
          },
          totalAllocation,
          overallocatedBy:
            ResourceAllocationCalculator.calculateOverallocatedBy(
              totalAllocation,
            ),
          projectCount: projects.length,
          projects,
        });
      }
    }

    overallocated.sort((a, b) => b.overallocatedBy - a.overallocatedBy);

    return {
      success: true,
      data: overallocated,
    };
  }

  async getAvailable(
    organizationId: string,
  ): Promise<{ success: boolean; data: AvailableResourceItem[] }> {
    const users = await this.prisma.user.findMany({
      where: {
        organizationId,
        role: { not: Role.CLIENT },
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        projectMemberships: {
          select: {
            allocationPercentage: true,
            project: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    const available: AvailableResourceItem[] = [];

    for (const user of users) {
      const projects: UserProjectAllocation[] = user.projectMemberships.map(
        (pm) => ({
          projectId: pm.project.id,
          projectName: pm.project.name,
          allocationPercentage: pm.allocationPercentage,
        }),
      );

      const totalAllocation =
        ResourceAllocationCalculator.calculateTotalAllocation(
          projects.map((p) => p.allocationPercentage),
        );

      if (totalAllocation < RESOURCE_POLICY.AVAILABLE_THRESHOLD) {
        available.push({
          userId: user.id,
          name: user.name,
          role: user.role,
          status: AllocationStatus.AVAILABLE,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
          },
          totalAllocation,
          availableCapacity:
            ResourceAllocationCalculator.calculateAvailableCapacity(
              totalAllocation,
            ),
          projectCount: projects.length,
          projects,
        });
      }
    }

    available.sort((a, b) => b.availableCapacity - a.availableCapacity);

    return {
      success: true,
      data: available,
    };
  }

  async getUtilization(
    organizationId: string,
  ): Promise<{ success: boolean; data: ResourceUtilizationSummary }> {
    const users = await this.prisma.user.findMany({
      where: {
        organizationId,
        role: { not: Role.CLIENT },
      },
      select: {
        id: true,
        projectMemberships: {
          select: {
            allocationPercentage: true,
          },
        },
      },
    });

    const totalResources = users.length;
    let totalAllocatedCapacity = 0;
    let availableCapacity = 0;
    let availableResources = 0;
    let fullyAllocatedResources = 0;
    let overallocatedResources = 0;

    for (const user of users) {
      const totalAllocation =
        ResourceAllocationCalculator.calculateTotalAllocation(
          user.projectMemberships.map((pm) => pm.allocationPercentage),
        );

      totalAllocatedCapacity += totalAllocation;
      availableCapacity +=
        ResourceAllocationCalculator.calculateAvailableCapacity(
          totalAllocation,
        );

      const status =
        ResourceAllocationCalculator.getResourceStatus(totalAllocation);
      if (status === AllocationStatus.AVAILABLE) {
        availableResources++;
      } else if (status === AllocationStatus.FULL) {
        fullyAllocatedResources++;
      } else if (status === AllocationStatus.OVERALLOCATED) {
        overallocatedResources++;
      }
    }

    const averageAllocation =
      totalResources > 0
        ? Math.round((totalAllocatedCapacity / totalResources) * 100) / 100
        : 0;

    return {
      success: true,
      data: {
        totalResources,
        totalAllocatedCapacity,
        availableCapacity,
        averageAllocation,
        availableResources,
        fullyAllocatedResources,
        overallocatedResources,
      },
    };
  }

  async getDistribution(
    organizationId: string,
  ): Promise<{ success: boolean; data: ResourceDistributionSummary }> {
    const users = await this.prisma.user.findMany({
      where: {
        organizationId,
        role: { not: Role.CLIENT },
      },
      select: {
        id: true,
        projectMemberships: {
          select: {
            allocationPercentage: true,
          },
        },
      },
    });

    const total = users.length;
    let availableCount = 0;
    let fullCount = 0;
    let overallocatedCount = 0;

    for (const user of users) {
      const totalAllocation =
        ResourceAllocationCalculator.calculateTotalAllocation(
          user.projectMemberships.map((pm) => pm.allocationPercentage),
        );

      const status =
        ResourceAllocationCalculator.getResourceStatus(totalAllocation);
      if (status === AllocationStatus.AVAILABLE) {
        availableCount++;
      } else if (status === AllocationStatus.FULL) {
        fullCount++;
      } else if (status === AllocationStatus.OVERALLOCATED) {
        overallocatedCount++;
      }
    }

    const calcPct = (count: number) =>
      total > 0 ? Math.round((count / total) * 10000) / 100 : 0;

    return {
      success: true,
      data: {
        AVAILABLE: availableCount,
        FULL: fullCount,
        OVERALLOCATED: overallocatedCount,
        total,
        available: {
          count: availableCount,
          percentage: calcPct(availableCount),
        },
        full: {
          count: fullCount,
          percentage: calcPct(fullCount),
        },
        overallocated: {
          count: overallocatedCount,
          percentage: calcPct(overallocatedCount),
        },
      },
    };
  }

  async getProjectRanking(
    organizationId: string,
  ): Promise<{ success: boolean; data: ProjectResourceRankingItem[] }> {
    const projects = await this.prisma.project.findMany({
      where: { organizationId },
      select: {
        id: true,
        name: true,
        status: true,
        projectMembers: {
          select: {
            allocationPercentage: true,
          },
        },
      },
    });

    const ranking: ProjectResourceRankingItem[] = projects.map((p) => {
      const memberCount = p.projectMembers.length;
      const totalAllocation =
        ResourceAllocationCalculator.calculateTotalAllocation(
          p.projectMembers.map((m) => m.allocationPercentage),
        );
      const averageMemberAllocation =
        memberCount > 0
          ? Math.round((totalAllocation / memberCount) * 100) / 100
          : 0;

      return {
        projectId: p.id,
        projectName: p.name,
        projectStatus: p.status,
        memberCount,
        totalAllocation,
        averageMemberAllocation,
      };
    });

    ranking.sort((a, b) => {
      if (b.totalAllocation !== a.totalAllocation) {
        return b.totalAllocation - a.totalAllocation;
      }
      return b.memberCount - a.memberCount;
    });

    return {
      success: true,
      data: ranking,
    };
  }

  async getProjectResources(
    organizationId: string,
    projectId: string,
    currentUser: AuthenticatedUser,
  ): Promise<{ success: boolean; data: ProjectResourceSummary }> {
    if (currentUser.role === Role.CLIENT) {
      throw new ForbiddenException(
        'Access denied: clients cannot view internal project resources',
      );
    }

    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        organizationId,
      },
      select: {
        id: true,
        name: true,
        status: true,
        projectMembers: {
          select: {
            allocationPercentage: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
                projectMemberships: {
                  select: {
                    allocationPercentage: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (currentUser.role === Role.TEAM_MEMBER) {
      const isMember = project.projectMembers.some(
        (pm) => pm.user.id === currentUser.id,
      );
      if (!isMember) {
        throw new ForbiddenException(
          'Access denied: You are not assigned to this project',
        );
      }
    }

    const totalMembers = project.projectMembers.length;
    const totalAllocation =
      ResourceAllocationCalculator.calculateTotalAllocation(
        project.projectMembers.map((pm) => pm.allocationPercentage),
      );
    const averageAllocation =
      totalMembers > 0
        ? Math.round((totalAllocation / totalMembers) * 100) / 100
        : 0;
    const capacityStatus =
      ResourceAllocationCalculator.calculateProjectCapacityStatus(
        averageAllocation,
      );

    const members: ProjectMemberResourceDetail[] = project.projectMembers.map(
      (pm) => {
        const totalUserAllocation =
          ResourceAllocationCalculator.calculateTotalAllocation(
            pm.user.projectMemberships.map((m) => m.allocationPercentage),
          );
        const userStatus =
          ResourceAllocationCalculator.getResourceStatus(totalUserAllocation);

        return {
          userId: pm.user.id,
          name: pm.user.name,
          email: pm.user.email,
          role: pm.user.role,
          allocationPercentage: pm.allocationPercentage,
          totalUserAllocation,
          userStatus,
        };
      },
    );

    return {
      success: true,
      data: {
        projectId: project.id,
        projectName: project.name,
        projectStatus: project.status,
        totalMembers,
        totalAllocation,
        averageAllocation,
        capacityStatus,
        members,
      },
    };
  }
}
