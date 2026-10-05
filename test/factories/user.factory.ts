import * as bcrypt from 'bcrypt';
import { Role } from '@prisma/client';
import { PrismaService } from '../../src/prisma/prisma.service.js';

export async function createTestUser(
  prisma: PrismaService,
  organizationId: string,
  role: Role = Role.TEAM_MEMBER,
  overrides: {
    name?: string;
    email?: string;
    password?: string;
    clientId?: string;
  } = {},
) {
  const unique = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  const password = overrides.password ?? 'Password123!';
  const passwordHash = await bcrypt.hash(password, 10);

  return prisma.user.create({
    data: {
      organizationId,
      clientId: overrides.clientId,
      role,
      name: overrides.name ?? `Test User ${unique}`,
      email: overrides.email ?? `user-${unique}@test.com`,
      passwordHash,
    },
  });
}
