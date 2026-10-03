import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { Role, AIReportStatus } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator.js';
import { AiReportsService } from './ai-reports.service.js';
import { GenerateAiReportDto } from './dto/generate-ai-report.dto.js';
import { AiReportQueryDto } from './dto/ai-report-query.dto.js';

@Controller('projects/:projectId/ai-reports')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AiReportsController {
  constructor(private readonly aiReportsService: AiReportsService) {}

  @Post()
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.PROJECT_MANAGER, Role.TEAM_LEAD)
  async generateReport(
    @CurrentUser() user: AuthenticatedUser,
    @Param('projectId') projectId: string,
    @Body() dto: GenerateAiReportDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.aiReportsService.generateReport(
      user.organizationId,
      projectId,
      dto,
    );

    if (result.data.status === AIReportStatus.COMPLETED) {
      res.status(HttpStatus.OK);
    } else {
      res.status(HttpStatus.ACCEPTED);
    }

    return result;
  }

  @Get()
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.PROJECT_MANAGER, Role.TEAM_LEAD)
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Param('projectId') projectId: string,
    @Query() query: AiReportQueryDto,
  ) {
    return this.aiReportsService.findAll(user.organizationId, projectId, query);
  }

  @Get(':reportId')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.PROJECT_MANAGER, Role.TEAM_LEAD)
  async findById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('projectId') projectId: string,
    @Param('reportId') reportId: string,
  ) {
    return this.aiReportsService.findById(
      user.organizationId,
      projectId,
      reportId,
    );
  }
}
