import { Controller, Get, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { QueueMonitorService } from './queue-monitor.service.js';

@Controller('admin/queues')
@UseGuards(JwtAuthGuard, RolesGuard)
export class QueuesController {
  constructor(private readonly queueMonitorService: QueueMonitorService) {}

  @Get('ai-reports')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  async getAiReportQueueMetrics() {
    const metrics = await this.queueMonitorService.getAiReportQueueMetrics();
    return {
      success: true,
      data: metrics,
      ...metrics,
    };
  }
}
