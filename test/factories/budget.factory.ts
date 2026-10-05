import { PrismaService } from '../../src/prisma/prisma.service.js';

export async function createTestBudget(
  prisma: PrismaService,
  projectId: string,
  overrides: {
    totalBudget?: number;
    currency?: string;
  } = {},
) {
  return prisma.projectBudget.create({
    data: {
      projectId,
      totalBudget: overrides.totalBudget ?? 50000,
      currency: overrides.currency ?? 'USD',
    },
  });
}
