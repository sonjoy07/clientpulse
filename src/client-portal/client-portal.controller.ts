import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { ClientPortalService } from './client-portal.service.js';
import { ClientProjectQueryDto } from './dto/client-project-query.dto.js';
import { ClientReportQueryDto } from './dto/client-report-query.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator.js';

@Controller('client-portal')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.CLIENT)
export class ClientPortalController {
  constructor(private readonly clientPortalService: ClientPortalService) {}

  @Get('dashboard')
  getDashboard(@CurrentUser() user: AuthenticatedUser) {
    return this.clientPortalService.getDashboard(user);
  }

  @Get('projects')
  getProjects(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ClientProjectQueryDto,
  ) {
    return this.clientPortalService.getProjects(user, query);
  }

  @Get('projects/:projectId')
  getProject(
    @CurrentUser() user: AuthenticatedUser,
    @Param('projectId') projectId: string,
  ) {
    return this.clientPortalService.getProject(user, projectId);
  }

  @Get('projects/:projectId/progress')
  getProjectProgress(
    @CurrentUser() user: AuthenticatedUser,
    @Param('projectId') projectId: string,
  ) {
    return this.clientPortalService.getProjectProgress(user, projectId);
  }

  @Get('projects/:projectId/milestones')
  getProjectMilestones(
    @CurrentUser() user: AuthenticatedUser,
    @Param('projectId') projectId: string,
  ) {
    return this.clientPortalService.getProjectMilestones(user, projectId);
  }

  @Get('projects/:projectId/status')
  getProjectDeliveryStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('projectId') projectId: string,
  ) {
    return this.clientPortalService.getProjectDeliveryStatus(user, projectId);
  }

  @Get('projects/:projectId/reports')
  getProjectReports(
    @CurrentUser() user: AuthenticatedUser,
    @Param('projectId') projectId: string,
    @Query() query: ClientReportQueryDto,
  ) {
    return this.clientPortalService.getProjectReports(user, projectId, query);
  }

  @Get('projects/:projectId/reports/:reportId')
  getProjectReportById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('projectId') projectId: string,
    @Param('reportId') reportId: string,
  ) {
    return this.clientPortalService.getProjectReportById(
      user,
      projectId,
      reportId,
    );
  }
}
