import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ResourcesService } from './resources.service.js';
import { ListResourceOverviewQueryDto } from './dto/list-resource-overview-query.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator.js';
import { Role } from '@prisma/client';

@Controller('resources')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ResourcesController {
  constructor(private readonly resourcesService: ResourcesService) {}

  @Get('overview')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.PROJECT_MANAGER, Role.TEAM_LEAD)
  getOverview(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListResourceOverviewQueryDto,
  ) {
    return this.resourcesService.getOverview(user.organizationId, query);
  }

  @Get('available')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.PROJECT_MANAGER, Role.TEAM_LEAD)
  getAvailable(@CurrentUser() user: AuthenticatedUser) {
    return this.resourcesService.getAvailable(user.organizationId);
  }

  @Get('overallocated')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.PROJECT_MANAGER, Role.TEAM_LEAD)
  getOverallocated(@CurrentUser() user: AuthenticatedUser) {
    return this.resourcesService.getOverallocated(user.organizationId);
  }

  @Get('utilization')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.PROJECT_MANAGER, Role.TEAM_LEAD)
  getUtilization(@CurrentUser() user: AuthenticatedUser) {
    return this.resourcesService.getUtilization(user.organizationId);
  }

  @Get('distribution')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.PROJECT_MANAGER, Role.TEAM_LEAD)
  getDistribution(@CurrentUser() user: AuthenticatedUser) {
    return this.resourcesService.getDistribution(user.organizationId);
  }

  @Get('projects/ranking')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.PROJECT_MANAGER, Role.TEAM_LEAD)
  getProjectRanking(@CurrentUser() user: AuthenticatedUser) {
    return this.resourcesService.getProjectRanking(user.organizationId);
  }

  @Get('projects/:projectId')
  @Roles(
    Role.SUPER_ADMIN,
    Role.ADMIN,
    Role.PROJECT_MANAGER,
    Role.TEAM_LEAD,
    Role.TEAM_MEMBER,
  )
  getProjectResources(
    @CurrentUser() user: AuthenticatedUser,
    @Param('projectId') projectId: string,
  ) {
    return this.resourcesService.getProjectResources(
      user.organizationId,
      projectId,
      user,
    );
  }

  @Get('users/:userId')
  @Roles(
    Role.SUPER_ADMIN,
    Role.ADMIN,
    Role.PROJECT_MANAGER,
    Role.TEAM_LEAD,
    Role.TEAM_MEMBER,
  )
  getUserResource(
    @CurrentUser() user: AuthenticatedUser,
    @Param('userId') userId: string,
  ) {
    return this.resourcesService.getUserResource(
      user.organizationId,
      userId,
      user,
    );
  }
}
