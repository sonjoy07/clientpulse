import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ProjectsService } from './projects.service.js';
import { ResourcesService } from '../resources/resources.service.js';
import { CreateProjectDto } from './dto/create-project.dto.js';
import { UpdateProjectDto } from './dto/update-project.dto.js';
import { ListProjectQueryDto } from './dto/list-project-query.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator.js';
import { Role } from '@prisma/client';

@Controller('projects')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProjectsController {
  constructor(
    private readonly projectsService: ProjectsService,
    private readonly resourcesService: ResourcesService,
  ) {}

  @Post()
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.PROJECT_MANAGER)
  @HttpCode(HttpStatus.CREATED)
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() createProjectDto: CreateProjectDto,
  ) {
    return this.projectsService.create(user.organizationId, createProjectDto);
  }

  @Get()
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListProjectQueryDto,
  ) {
    return this.projectsService.findAll(user.organizationId, query);
  }

  @Get('portfolio-summary')
  @Roles(
    Role.SUPER_ADMIN,
    Role.ADMIN,
    Role.PROJECT_MANAGER,
    Role.TEAM_LEAD,
    Role.TEAM_MEMBER,
  )
  getPortfolioSummary(@CurrentUser() user: AuthenticatedUser) {
    return this.projectsService.getPortfolioSummary(user.organizationId);
  }

  @Get(':id/delivery-summary')
  @Roles(
    Role.SUPER_ADMIN,
    Role.ADMIN,
    Role.PROJECT_MANAGER,
    Role.TEAM_LEAD,
    Role.TEAM_MEMBER,
  )
  getDeliverySummary(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.projectsService.getDeliverySummary(user.organizationId, id);
  }

  @Get(':id/resources')
  @Roles(
    Role.SUPER_ADMIN,
    Role.ADMIN,
    Role.PROJECT_MANAGER,
    Role.TEAM_LEAD,
    Role.TEAM_MEMBER,
  )
  getProjectResources(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.resourcesService.getProjectResources(
      user.organizationId,
      id,
      user,
    );
  }

  @Get(':id/health')
  @Roles(
    Role.SUPER_ADMIN,
    Role.ADMIN,
    Role.PROJECT_MANAGER,
    Role.TEAM_LEAD,
    Role.TEAM_MEMBER,
  )
  getHealth(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.projectsService.getProjectHealth(user.organizationId, id);
  }

  @Get(':id/risks')
  @Roles(
    Role.SUPER_ADMIN,
    Role.ADMIN,
    Role.PROJECT_MANAGER,
    Role.TEAM_LEAD,
    Role.TEAM_MEMBER,
  )
  getRisks(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.projectsService.getProjectRisks(user.organizationId, id);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.projectsService.findOne(user.organizationId, id);
  }

  @Patch(':id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.PROJECT_MANAGER)
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() updateProjectDto: UpdateProjectDto,
  ) {
    return this.projectsService.update(
      user.organizationId,
      id,
      updateProjectDto,
    );
  }

  @Delete(':id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.projectsService.remove(user.organizationId, id);
  }
}
