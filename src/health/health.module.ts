import { Module } from '@nestjs/common';
import { HealthController } from './health.controller.js';
import { HealthService } from './health.service.js';

import { QueuesModule } from '../queues/queues.module.js';

@Module({
  imports: [QueuesModule],
  controllers: [HealthController],
  providers: [HealthService],
})
export class HealthModule {}
