import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ProjectMembersService } from './project-members.service.js';
import { AddProjectMemberDto } from './dto/add-project-member.dto.js';
import { UpdateProjectMemberDto } from './dto/update-project-member.dto.js';
import { ListProjectMemberQueryDto } from './dto/list-project-member-query.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator.js';
import { Role } from '@prisma/client';

@Controller('projects/:projectId/members')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProjectMembersController {
  constructor(private readonly projectMembersService: ProjectMembersService) {}

  @Post()
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.PROJECT_MANAGER, Role.TEAM_LEAD)
  @HttpCode(HttpStatus.CREATED)
  addMember(
    @CurrentUser() user: AuthenticatedUser,
    @Param('projectId') projectId: string,
    @Body() dto: AddProjectMemberDto,
  ) {
    return this.projectMembersService.addMember(
      user.organizationId,
      projectId,
      dto,
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
    @Query() query: ListProjectMemberQueryDto,
  ) {
    return this.projectMembersService.findAll(
      user.organizationId,
      projectId,
      query,
    );
  }

  @Patch(':memberId')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.PROJECT_MANAGER, Role.TEAM_LEAD)
  updateMember(
    @CurrentUser() user: AuthenticatedUser,
    @Param('projectId') projectId: string,
    @Param('memberId') memberId: string,
    @Body() dto: UpdateProjectMemberDto,
  ) {
    return this.projectMembersService.updateMember(
      user.organizationId,
      projectId,
      memberId,
      dto,
    );
  }

  @Delete(':memberId')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.PROJECT_MANAGER, Role.TEAM_LEAD)
  removeMember(
    @CurrentUser() user: AuthenticatedUser,
    @Param('projectId') projectId: string,
    @Param('memberId') memberId: string,
  ) {
    return this.projectMembersService.removeMember(
      user.organizationId,
      projectId,
      memberId,
    );
  }
}
