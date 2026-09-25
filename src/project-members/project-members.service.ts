import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { AddProjectMemberDto } from './dto/add-project-member.dto.js';
import { UpdateProjectMemberDto } from './dto/update-project-member.dto.js';
import { ListProjectMemberQueryDto } from './dto/list-project-member-query.dto.js';
import { PaginatedResponse } from '../common/interfaces/paginated-response.interface.js';

@Injectable()
export class ProjectMembersService {
  constructor(private readonly prisma: PrismaService) {}

  async addMember(
    organizationId: string,
    projectId: string,
    dto: AddProjectMemberDto,
  ) {
    // Rule 1 & 2: Project must exist and belong to the authenticated user's organization
    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        organizationId,
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Rule 3 & 4: User must exist and belong to the same organization
    const user = await this.prisma.user.findFirst({
      where: {
        id: dto.userId,
        organizationId,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found within organization');
    }

    // Rule 5: User must not already be a member
    const existingMember = await this.prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId: dto.userId,
        },
      },
    });

    if (existingMember) {
      throw new ConflictException('User is already assigned to this project');
    }

    const member = await this.prisma.projectMember.create({
      data: {
        projectId,
        userId: dto.userId,
        allocationPercentage: dto.allocationPercentage ?? 100,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    return {
      success: true,
      data: member,
    };
  }

  async findAll(
    organizationId: string,
    projectId: string,
    query: ListProjectMemberQueryDto,
  ): Promise<PaginatedResponse<unknown>> {
    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        organizationId,
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 10));
    const skip = (page - 1) * limit;

    const [total, items] = await this.prisma.$transaction([
      this.prisma.projectMember.count({
        where: { projectId },
      }),
      this.prisma.projectMember.findMany({
        where: { projectId },
        skip,
        take: limit,
        orderBy: { joinedAt: 'asc' },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
      }),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      success: true,
      data: items,
      meta: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  async updateMember(
    organizationId: string,
    projectId: string,
    memberId: string,
    dto: UpdateProjectMemberDto,
  ) {
    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        organizationId,
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const member = await this.prisma.projectMember.findFirst({
      where: {
        projectId,
        OR: [{ id: memberId }, { userId: memberId }],
      },
    });

    if (!member) {
      throw new NotFoundException('Project member not found');
    }

    const updated = await this.prisma.projectMember.update({
      where: { id: member.id },
      data: {
        allocationPercentage: dto.allocationPercentage,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    return {
      success: true,
      data: updated,
    };
  }

  async removeMember(
    organizationId: string,
    projectId: string,
    memberId: string,
  ) {
    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        organizationId,
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const member = await this.prisma.projectMember.findFirst({
      where: {
        projectId,
        OR: [{ id: memberId }, { userId: memberId }],
      },
    });

    if (!member) {
      throw new NotFoundException('Project member not found');
    }

    await this.prisma.projectMember.delete({
      where: { id: member.id },
    });

    return {
      success: true,
      message: 'Member removed from project successfully',
    };
  }
}
