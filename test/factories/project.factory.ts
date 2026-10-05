import { ProjectStatus } from '@prisma/client';
import { PrismaService } from '../../src/prisma/prisma.service.js';

export async function createTestProject(
  prisma: PrismaService,
  organizationId: string,
  clientId: string,
  overrides: {
    name?: string;
    description?: string;
    status?: ProjectStatus;
    startDate?: Date;
    endDate?: Date;
  } = {},
) {
  const unique = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  return prisma.project.create({
    data: {
      organizationId,
      clientId,
      name: overrides.name ?? `Test Project ${unique}`,
      description: overrides.description ?? 'A delivery project under test',
      status: overrides.status ?? ProjectStatus.ACTIVE,
      startDate: overrides.startDate ?? new Date('2026-01-01T00:00:00.000Z'),
      endDate: overrides.endDate ?? new Date('2026-06-01T00:00:00.000Z'),
    },
  });
}
