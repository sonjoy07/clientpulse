import { Module } from '@nestjs/common';
import { ClientPortalController } from './client-portal.controller.js';
import { ClientPortalService } from './client-portal.service.js';
import { ProjectsModule } from '../projects/projects.module.js';

@Module({
  imports: [ProjectsModule],
  controllers: [ClientPortalController],
  providers: [ClientPortalService],
  exports: [ClientPortalService],
})
export class ClientPortalModule {}
