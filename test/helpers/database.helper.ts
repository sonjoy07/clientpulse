import { PrismaService } from '../../src/prisma/prisma.service.js';

export function assertTestDatabaseSafety(): void {
  const nodeEnv = process.env.NODE_ENV;
  if (nodeEnv === 'production') {
    throw new Error(
      'FATAL: Refusing to run destructive test database operation in PRODUCTION environment!',
    );
  }

  const dbUrl = process.env.DATABASE_URL_TEST || process.env.DATABASE_URL || '';
  const lowerUrl = dbUrl.toLowerCase();
  if (
    (lowerUrl.includes('prod') || lowerUrl.includes('production')) &&
    !lowerUrl.includes('test')
  ) {
    throw new Error(
      'FATAL: Refusing to run destructive test database operation against a production database URL!',
    );
  }
}

export async function cleanDatabase(
  prisma: PrismaService,
  organizationIds?: string[],
): Promise<void> {
  assertTestDatabaseSafety();

  const whereOrg = organizationIds
    ? { organizationId: { in: organizationIds } }
    : {};
  const whereProject = organizationIds
    ? { project: { organizationId: { in: organizationIds } } }
    : {};

  await prisma.aIReport.deleteMany({
    where: whereProject,
  });
  await prisma.costEntry.deleteMany({
    where: whereProject,
  });
  await prisma.projectBudget.deleteMany({
    where: whereProject,
  });
  await prisma.task.deleteMany({
    where: whereProject,
  });
  await prisma.milestone.deleteMany({
    where: whereProject,
  });
  await prisma.projectMember.deleteMany({
    where: whereProject,
  });
  await prisma.project.deleteMany({
    where: whereOrg,
  });
  await prisma.refreshToken.deleteMany({
    where: organizationIds
      ? { user: { organizationId: { in: organizationIds } } }
      : {},
  });
  await prisma.user.deleteMany({
    where: whereOrg,
  });
  await prisma.client.deleteMany({
    where: whereOrg,
  });
  if (organizationIds && organizationIds.length > 0) {
    await prisma.organization.deleteMany({
      where: { id: { in: organizationIds } },
    });
  }
}
