import { Module } from '@nestjs/common';
import { TasksService } from './tasks.service.js';
import { TasksController } from './tasks.controller.js';
import { OrganizationTasksController } from './organization-tasks.controller.js';
import { PrismaModule } from '../prisma/prisma.module.js';

@Module({
  imports: [PrismaModule],
  controllers: [TasksController, OrganizationTasksController],
  providers: [TasksService],
  exports: [TasksService],
})
export class TasksModule {}
