import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { TasksService } from './tasks.service.js';
import { UpdateTaskDto } from './dto/update-task.dto.js';
import { ListTaskQueryDto } from './dto/list-task-query.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator.js';
import { Role } from '@prisma/client';

@Controller('tasks')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrganizationTasksController {
  constructor(private readonly tasksService: TasksService) {}

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
    @Query() query: ListTaskQueryDto,
  ) {
    return this.tasksService.findAllOrganizationTasks(user, query);
  }

  @Get('my')
  @Roles(
    Role.SUPER_ADMIN,
    Role.ADMIN,
    Role.PROJECT_MANAGER,
    Role.TEAM_LEAD,
    Role.TEAM_MEMBER,
  )
  findMyTasks(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListTaskQueryDto,
  ) {
    return this.tasksService.findMyTasks(user, query);
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
    @Param('taskId') taskId: string,
    @Body() updateTaskDto: UpdateTaskDto,
  ) {
    return this.tasksService.updateDirect(user, taskId, updateTaskDto);
  }
}
