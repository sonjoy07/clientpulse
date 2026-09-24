import { Module } from '@nestjs/common';
import { ProjectsService } from './projects.service.js';
import { ProjectsController } from './projects.controller.js';
import { ResourcesModule } from '../resources/resources.module.js';
import { RiskEngineService } from './services/risk-engine.service.js';
import { HealthScoreService } from './services/health-score.service.js';

@Module({
  imports: [ResourcesModule],
  controllers: [ProjectsController],
  providers: [ProjectsService, RiskEngineService, HealthScoreService],
  exports: [ProjectsService, RiskEngineService, HealthScoreService],
})
export class ProjectsModule {}
