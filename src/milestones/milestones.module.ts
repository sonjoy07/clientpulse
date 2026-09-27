import { Module } from '@nestjs/common';
import { MilestonesService } from './milestones.service.js';
import { MilestonesController } from './milestones.controller.js';
import { PrismaModule } from '../prisma/prisma.module.js';

@Module({
  imports: [PrismaModule],
  controllers: [MilestonesController],
  providers: [MilestonesService],
  exports: [MilestonesService],
})
export class MilestonesModule {}
