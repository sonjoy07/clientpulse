import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration.js';
import { validate } from './config/env.validation.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { HealthModule } from './health/health.module.js';
import { AuthModule } from './auth/auth.module.js';
import { ClientsModule } from './clients/clients.module.js';
import { ProjectsModule } from './projects/projects.module.js';
import { ProjectMembersModule } from './project-members/project-members.module.js';
import { MilestonesModule } from './milestones/milestones.module.js';
import { TasksModule } from './tasks/tasks.module.js';
import { ResourcesModule } from './resources/resources.module.js';
import { BudgetsModule } from './budgets/budgets.module.js';
import { ClientPortalModule } from './client-portal/client-portal.module.js';
import { AiReportsModule } from './ai-reports/ai-reports.module.js';
import { QueuesModule } from './queues/queues.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate,
    }),
    PrismaModule,
    HealthModule,
    AuthModule,
    ClientsModule,
    ProjectsModule,
    ProjectMembersModule,
    MilestonesModule,
    TasksModule,
    ResourcesModule,
    BudgetsModule,
    ClientPortalModule,
    QueuesModule,
    AiReportsModule,
  ],
})
export class AppModule {}
