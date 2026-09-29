import { Module } from '@nestjs/common';
import { BudgetsService } from './budgets.service.js';
import { BudgetsController } from './budgets.controller.js';
import { BudgetCalculationService } from './budget-calculation.service.js';
import { PrismaModule } from '../prisma/prisma.module.js';

@Module({
  imports: [PrismaModule],
  controllers: [BudgetsController],
  providers: [BudgetsService, BudgetCalculationService],
  exports: [BudgetsService, BudgetCalculationService],
})
export class BudgetsModule {}
