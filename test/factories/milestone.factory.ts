import { MilestoneStatus } from '@prisma/client';
import { PrismaService } from '../../src/prisma/prisma.service.js';

export async function createTestMilestone(
  prisma: PrismaService,
  projectId: string,
  overrides: {
    name?: string;
    description?: string;
    status?: MilestoneStatus;
    startDate?: Date;
    dueDate?: Date;
  } = {},
) {
  const unique = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  return prisma.milestone.create({
    data: {
      projectId,
      name: overrides.name ?? `Milestone ${unique}`,
      description: overrides.description ?? 'Test milestone description',
      status: overrides.status ?? MilestoneStatus.IN_PROGRESS,
      startDate: overrides.startDate ?? new Date('2026-01-01T00:00:00.000Z'),
      dueDate: overrides.dueDate ?? new Date('2026-04-01T00:00:00.000Z'),
    },
  });
}
