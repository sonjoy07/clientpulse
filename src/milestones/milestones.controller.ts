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
import { MilestonesService } from './milestones.service.js';
import { CreateMilestoneDto } from './dto/create-milestone.dto.js';
import { UpdateMilestoneDto } from './dto/update-milestone.dto.js';
import { ListMilestoneQueryDto } from './dto/list-milestone-query.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator.js';
import { Role } from '@prisma/client';

@Controller('projects/:projectId/milestones')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MilestonesController {
  constructor(private readonly milestonesService: MilestonesService) {}

  @Post()
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.PROJECT_MANAGER, Role.TEAM_LEAD)
  @HttpCode(HttpStatus.CREATED)
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Param('projectId') projectId: string,
    @Body() createMilestoneDto: CreateMilestoneDto,
  ) {
    return this.milestonesService.create(
      user.organizationId,
      projectId,
      createMilestoneDto,
    );
  }

  @Get()
  @Roles(
    Role.SUPER_ADMIN,
    Role.ADMIN,
    Role.PROJECT_MANAGER,
    Role.TEAM_LEAD,
    Role.TEAM_MEMBER,
  )
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Param('projectId') projectId: string,
    @Query() query: ListMilestoneQueryDto,
  ) {
    return this.milestonesService.findAll(
      user.organizationId,
      projectId,
      query,
    );
  }

  @Get(':milestoneId')
  @Roles(
    Role.SUPER_ADMIN,
    Role.ADMIN,
    Role.PROJECT_MANAGER,
    Role.TEAM_LEAD,
    Role.TEAM_MEMBER,
  )
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('projectId') projectId: string,
    @Param('milestoneId') milestoneId: string,
  ) {
    return this.milestonesService.findOne(
      user.organizationId,
      projectId,
      milestoneId,
    );
  }

  @Patch(':milestoneId')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.PROJECT_MANAGER, Role.TEAM_LEAD)
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('projectId') projectId: string,
    @Param('milestoneId') milestoneId: string,
    @Body() updateMilestoneDto: UpdateMilestoneDto,
  ) {
    return this.milestonesService.update(
      user.organizationId,
      projectId,
      milestoneId,
      updateMilestoneDto,
    );
  }

  @Delete(':milestoneId')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.PROJECT_MANAGER)
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('projectId') projectId: string,
    @Param('milestoneId') milestoneId: string,
  ) {
    return this.milestonesService.remove(
      user.organizationId,
      projectId,
      milestoneId,
    );
  }
}
