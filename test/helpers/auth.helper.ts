import request from 'supertest';
import * as bcrypt from 'bcrypt';
import { Role } from '@prisma/client';
import { PrismaService } from '../../src/prisma/prisma.service.js';

export async function loginUser(
  server: Parameters<typeof request>[0],
  email: string,
  password = 'Password123!',
): Promise<{ accessToken: string; refreshToken: string }> {
  const res = await request(server)
    .post('/api/v1/auth/login')
    .send({ email, password });

  const body = res.body as { accessToken: string; refreshToken: string };
  return {
    accessToken: body.accessToken,
    refreshToken: body.refreshToken,
  };
}

export async function createAndLoginUser(
  prisma: PrismaService,
  server: Parameters<typeof request>[0],
  organizationId: string,
  role: Role,
  emailPrefix = 'user',
  clientId?: string,
): Promise<{ user: { id: string; email: string }; token: string }> {
  const password = 'Password123!';
  const passwordHash = await bcrypt.hash(password, 10);
  const email = `${emailPrefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}@test.com`;

  const user = await prisma.user.create({
    data: {
      organizationId,
      clientId,
      role,
      name: `${role} ${emailPrefix}`,
      email,
      passwordHash,
    },
  });

  const { accessToken } = await loginUser(server, email, password);
  return { user: { id: user.id, email: user.email }, token: accessToken };
}
