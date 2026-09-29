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
import { BudgetsService } from './budgets.service.js';
import { CreateBudgetDto } from './dto/create-budget.dto.js';
import { UpdateBudgetDto } from './dto/update-budget.dto.js';
import { AddCostEntryDto } from './dto/add-cost-entry.dto.js';
import { UpdateCostEntryDto } from './dto/update-cost-entry.dto.js';
import { ListCostEntryQueryDto } from './dto/list-cost-entry-query.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator.js';
import { Role } from '@prisma/client';

@Controller('projects/:projectId/budget')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BudgetsController {
  constructor(private readonly budgetsService: BudgetsService) {}

  @Post()
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.PROJECT_MANAGER)
  @HttpCode(HttpStatus.CREATED)
  createBudget(
    @CurrentUser() user: AuthenticatedUser,
    @Param('projectId') projectId: string,
    @Body() dto: CreateBudgetDto,
  ) {
    return this.budgetsService.createBudget(
      user.organizationId,
      projectId,
      dto,
    );
  }

  @Get()
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.PROJECT_MANAGER, Role.TEAM_LEAD)
  getBudget(
    @CurrentUser() user: AuthenticatedUser,
    @Param('projectId') projectId: string,
  ) {
    return this.budgetsService.getBudget(user.organizationId, projectId);
  }

  @Patch()
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.PROJECT_MANAGER)
  updateBudget(
    @CurrentUser() user: AuthenticatedUser,
    @Param('projectId') projectId: string,
    @Body() dto: UpdateBudgetDto,
  ) {
    return this.budgetsService.updateBudget(
      user.organizationId,
      projectId,
      dto,
    );
  }

  @Get('summary')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.PROJECT_MANAGER, Role.TEAM_LEAD)
  getBudgetSummary(
    @CurrentUser() user: AuthenticatedUser,
    @Param('projectId') projectId: string,
  ) {
    return this.budgetsService.getBudgetSummary(user.organizationId, projectId);
  }

  @Get('breakdown')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.PROJECT_MANAGER, Role.TEAM_LEAD)
  getCostBreakdown(
    @CurrentUser() user: AuthenticatedUser,
    @Param('projectId') projectId: string,
  ) {
    return this.budgetsService.getCostBreakdown(user.organizationId, projectId);
  }

  @Get('monthly')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.PROJECT_MANAGER, Role.TEAM_LEAD)
  getMonthlyCostSummary(
    @CurrentUser() user: AuthenticatedUser,
    @Param('projectId') projectId: string,
  ) {
    return this.budgetsService.getMonthlyCostSummary(
      user.organizationId,
      projectId,
    );
  }

  @Post('costs')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.PROJECT_MANAGER, Role.TEAM_LEAD)
  @HttpCode(HttpStatus.CREATED)
  addCostEntry(
    @CurrentUser() user: AuthenticatedUser,
    @Param('projectId') projectId: string,
    @Body() dto: AddCostEntryDto,
  ) {
    return this.budgetsService.addCostEntry(
      user.organizationId,
      projectId,
      user.id,
      dto,
    );
  }

  @Get('costs')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.PROJECT_MANAGER, Role.TEAM_LEAD)
  findAllCosts(
    @CurrentUser() user: AuthenticatedUser,
    @Param('projectId') projectId: string,
    @Query() query: ListCostEntryQueryDto,
  ) {
    return this.budgetsService.findAllCosts(
      user.organizationId,
      projectId,
      query,
    );
  }

  @Get('costs/:costId')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.PROJECT_MANAGER, Role.TEAM_LEAD)
  findOneCost(
    @CurrentUser() user: AuthenticatedUser,
    @Param('projectId') projectId: string,
    @Param('costId') costId: string,
  ) {
    return this.budgetsService.findOneCost(
      user.organizationId,
      projectId,
      costId,
    );
  }

  @Patch('costs/:costId')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.PROJECT_MANAGER, Role.TEAM_LEAD)
  updateCostEntry(
    @CurrentUser() user: AuthenticatedUser,
    @Param('projectId') projectId: string,
    @Param('costId') costId: string,
    @Body() dto: UpdateCostEntryDto,
  ) {
    return this.budgetsService.updateCostEntry(
      user.organizationId,
      projectId,
      costId,
      dto,
    );
  }

  @Delete('costs/:costId')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.PROJECT_MANAGER)
  deleteCostEntry(
    @CurrentUser() user: AuthenticatedUser,
    @Param('projectId') projectId: string,
    @Param('costId') costId: string,
  ) {
    return this.budgetsService.deleteCostEntry(
      user.organizationId,
      projectId,
      costId,
    );
  }
}
