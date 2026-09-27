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
import { TasksService } from './tasks.service.js';
import { CreateTaskDto } from './dto/create-task.dto.js';
import { UpdateTaskDto } from './dto/update-task.dto.js';
import { ListTaskQueryDto } from './dto/list-task-query.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator.js';
import { Role } from '@prisma/client';

@Controller('projects/:projectId/tasks')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.PROJECT_MANAGER, Role.TEAM_LEAD)
  @HttpCode(HttpStatus.CREATED)
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Param('projectId') projectId: string,
    @Body() createTaskDto: CreateTaskDto,
  ) {
    return this.tasksService.create(
      user.organizationId,
      projectId,
      createTaskDto,
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
    @Query() query: ListTaskQueryDto,
  ) {
    return this.tasksService.findAll(user.organizationId, projectId, query);
  }

  @Get(':taskId')
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
    @Param('taskId') taskId: string,
  ) {
    return this.tasksService.findOne(user.organizationId, projectId, taskId);
  }

  @Patch(':taskId')
  @Roles(
    Role.SUPER_ADMIN,
    Role.ADMIN,
    Role.PROJECT_MANAGER,
    Role.TEAM_LEAD,
    Role.TEAM_MEMBER,
  )
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('projectId') projectId: string,
    @Param('taskId') taskId: string,
    @Body() updateTaskDto: UpdateTaskDto,
  ) {
    return this.tasksService.update(user, projectId, taskId, updateTaskDto);
  }

  @Delete(':taskId')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.PROJECT_MANAGER, Role.TEAM_LEAD)
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('projectId') projectId: string,
    @Param('taskId') taskId: string,
  ) {
    return this.tasksService.remove(user, projectId, taskId);
  }
}
