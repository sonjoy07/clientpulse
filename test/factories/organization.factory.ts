import { PrismaService } from '../../src/prisma/prisma.service.js';

export async function createTestOrganization(
  prisma: PrismaService,
  overrides: { name?: string; slug?: string } = {},
) {
  const unique = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  return prisma.organization.create({
    data: {
      name: overrides.name ?? `Test Org ${unique}`,
      slug: overrides.slug ?? `test-org-${unique}`,
    },
  });
}
