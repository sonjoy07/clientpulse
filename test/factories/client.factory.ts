import { PrismaService } from '../../src/prisma/prisma.service.js';

export async function createTestClient(
  prisma: PrismaService,
  organizationId: string,
  overrides: {
    name?: string;
    companyName?: string;
    email?: string;
  } = {},
) {
  const unique = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  return prisma.client.create({
    data: {
      organizationId,
      name: overrides.name ?? `Client Rep ${unique}`,
      companyName: overrides.companyName ?? `Acme Client ${unique}`,
      email: overrides.email ?? `client-${unique}@test.com`,
    },
  });
}
