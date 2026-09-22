import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AppModule } from '../src/app.module.js';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter.js';

describe('Authentication & RBAC (e2e)', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let configService: ConfigService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalFilters(new HttpExceptionFilter());

    jwtService = moduleFixture.get<JwtService>(JwtService);
    configService = moduleFixture.get<ConfigService>(ConfigService);

    await app.init();
  }, 30000);

  afterAll(async () => {
    await app.close();
  }, 30000);

  describe('POST /api/v1/auth/login', () => {
    it('valid credentials -> returns user, accessToken, and refreshToken', async () => {
      const server = app.getHttpServer() as Parameters<typeof request>[0];
      const res = await request(server)
        .post('/api/v1/auth/login')
        .send({
          email: 'admin@acme.example.com',
          password: 'Password123!',
        })
        .expect(200);

      const body = res.body as Record<string, unknown>;
      expect(body).toHaveProperty('accessToken');
      expect(body).toHaveProperty('refreshToken');
      expect(body).toHaveProperty('user');

      const user = body['user'] as Record<string, unknown>;
      expect(user['email']).toBe('admin@acme.example.com');
      expect(user['role']).toBe('ADMIN');
      expect(user).not.toHaveProperty('passwordHash');
      expect(user).toHaveProperty('organizationId');
    });

    it('wrong password -> returns 401 Unauthorized', async () => {
      const server = app.getHttpServer() as Parameters<typeof request>[0];
      const res = await request(server)
        .post('/api/v1/auth/login')
        .send({
          email: 'admin@acme.example.com',
          password: 'WrongPassword123!',
        })
        .expect(401);

      const body = res.body as Record<string, unknown>;
      expect(body['success']).toBe(false);
      expect(body['message']).toBe('Invalid credentials');
    });

    it('unknown email -> returns 401 Unauthorized', async () => {
      const server = app.getHttpServer() as Parameters<typeof request>[0];
      const res = await request(server)
        .post('/api/v1/auth/login')
        .send({
          email: 'nonexistent@acme.example.com',
          password: 'Password123!',
        })
        .expect(401);

      const body = res.body as Record<string, unknown>;
      expect(body['success']).toBe(false);
      expect(body['message']).toBe('Invalid credentials');
    });

    it('invalid email -> returns 400 Bad Request', async () => {
      const server = app.getHttpServer() as Parameters<typeof request>[0];
      const res = await request(server)
        .post('/api/v1/auth/login')
        .send({
          email: 'not-an-email',
          password: 'Password123!',
        })
        .expect(400);

      const body = res.body as Record<string, unknown>;
      expect(body['success']).toBe(false);
      expect(body['statusCode']).toBe(400);
    });

    it('short password (< 8 chars) -> returns 400 Bad Request', async () => {
      const server = app.getHttpServer() as Parameters<typeof request>[0];
      const res = await request(server)
        .post('/api/v1/auth/login')
        .send({
          email: 'admin@acme.example.com',
          password: 'short',
        })
        .expect(400);

      const body = res.body as Record<string, unknown>;
      expect(body['success']).toBe(false);
      expect(body['statusCode']).toBe(400);
    });
  });

  describe('JWT authentication & /api/v1/auth/me', () => {
    it('no token -> returns 401 Unauthorized', async () => {
      const server = app.getHttpServer() as Parameters<typeof request>[0];
      await request(server).get('/api/v1/auth/me').expect(401);
    });

    it('invalid token -> returns 401 Unauthorized', async () => {
      const server = app.getHttpServer() as Parameters<typeof request>[0];
      await request(server)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalid.token.payload')
        .expect(401);
    });

    it('expired token -> returns 401 Unauthorized', async () => {
      const secret = configService.get<string>('jwt.accessSecret');
      const expiredToken = await jwtService.signAsync(
        {
          sub: 'any-user-id',
          organizationId: 'any-org-id',
          role: 'ADMIN',
        },
        {
          secret,
          expiresIn: '-1s',
        },
      );

      const server = app.getHttpServer() as Parameters<typeof request>[0];
      await request(server)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);
    });

    it('valid token -> returns 200 with authenticated user profile', async () => {
      const server = app.getHttpServer() as Parameters<typeof request>[0];
      const loginRes = await request(server).post('/api/v1/auth/login').send({
        email: 'admin@acme.example.com',
        password: 'Password123!',
      });

      const accessToken = (loginRes.body as { accessToken: string })
        .accessToken;

      const res = await request(server)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const user = res.body as Record<string, unknown>;
      expect(user['email']).toBe('admin@acme.example.com');
      expect(user['role']).toBe('ADMIN');
      expect(user).not.toHaveProperty('passwordHash');
      expect(user).toHaveProperty('organizationId');
    });
  });

  describe('RBAC RolesGuard', () => {
    it('allowed role (ADMIN) -> returns 200 success', async () => {
      const server = app.getHttpServer() as Parameters<typeof request>[0];
      const loginRes = await request(server).post('/api/v1/auth/login').send({
        email: 'admin@acme.example.com',
        password: 'Password123!',
      });

      const accessToken = (loginRes.body as { accessToken: string })
        .accessToken;

      const res = await request(server)
        .get('/api/v1/auth/admin-test')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const body = res.body as Record<string, unknown>;
      expect(body['role']).toBe('ADMIN');
    });

    it('disallowed role (TEAM_MEMBER) -> returns 403 Forbidden', async () => {
      const server = app.getHttpServer() as Parameters<typeof request>[0];
      const loginRes = await request(server).post('/api/v1/auth/login').send({
        email: 'dev@acme.example.com',
        password: 'Password123!',
      });

      const accessToken = (loginRes.body as { accessToken: string })
        .accessToken;

      const res = await request(server)
        .get('/api/v1/auth/admin-test')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(403);

      const body = res.body as Record<string, unknown>;
      expect(body['success']).toBe(false);
      expect(body['statusCode']).toBe(403);
    });
  });

  describe('Refresh Token flow', () => {
    it('valid refresh token -> issues new access token', async () => {
      const server = app.getHttpServer() as Parameters<typeof request>[0];
      const loginRes = await request(server).post('/api/v1/auth/login').send({
        email: 'admin@acme.example.com',
        password: 'Password123!',
      });

      const refreshToken = (loginRes.body as { refreshToken: string })
        .refreshToken;

      const refreshRes = await request(server)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      const body = refreshRes.body as Record<string, unknown>;
      expect(body).toHaveProperty('accessToken');
      expect(typeof body['accessToken']).toBe('string');
    });

    it('invalid refresh token -> returns 401 Unauthorized', async () => {
      const server = app.getHttpServer() as Parameters<typeof request>[0];
      await request(server)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: 'invalid.random.string' })
        .expect(401);
    });

    it('revoked refresh token -> returns 401 Unauthorized', async () => {
      const server = app.getHttpServer() as Parameters<typeof request>[0];
      const loginRes = await request(server).post('/api/v1/auth/login').send({
        email: 'admin@acme.example.com',
        password: 'Password123!',
      });

      const refreshToken = (loginRes.body as { refreshToken: string })
        .refreshToken;

      // Logout to revoke the token
      await request(server)
        .post('/api/v1/auth/logout')
        .send({ refreshToken })
        .expect(200);

      // Attempt to refresh with the revoked token
      const res = await request(server)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken })
        .expect(401);

      const body = res.body as Record<string, unknown>;
      expect(body['success']).toBe(false);
      expect(body['message']).toBe('Refresh token has been revoked');
    });

    it('expired refresh token -> returns 401 Unauthorized', async () => {
      const refreshSecret = configService.get<string>('jwt.refreshSecret');
      const expiredRefreshToken = await jwtService.signAsync(
        { sub: 'some-user-id' },
        {
          secret: refreshSecret,
          expiresIn: '-1s',
        },
      );

      const server = app.getHttpServer() as Parameters<typeof request>[0];
      await request(server)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: expiredRefreshToken })
        .expect(401);
    });
  });
});
