import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter.js';

describe('Health & Global Config (e2e)', () => {
  let app: INestApplication;

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
    await app.init();
  }, 30000);

  afterAll(async () => {
    await app.close();
  }, 30000);

  it('/api/v1/health (GET) should return 200 with service health info', async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];
    const response = await request(server).get('/api/v1/health').expect(200);

    const body = response.body as Record<string, unknown>;
    expect(body).toMatchObject({
      status: 'ok',
      service: 'clientpulse-api',
      database: 'connected',
    });
    expect(body['timestamp']).toBeDefined();
  });

  it('/api/v1/health/live (GET) should return 200 with process liveness info', async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];
    const response = await request(server)
      .get('/api/v1/health/live')
      .expect(200);

    const body = response.body as Record<string, unknown>;
    expect(body).toMatchObject({
      status: 'ok',
      service: 'clientpulse-api',
    });
    expect(typeof body['uptime']).toBe('number');
    expect(body['timestamp']).toBeDefined();
  });

  it('/api/v1/health/ready (GET) should return 200 with readiness check results', async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];
    const response = await request(server)
      .get('/api/v1/health/ready')
      .expect(200);

    const body = response.body as Record<string, unknown>;
    expect(body).toMatchObject({
      status: 'ok',
      service: 'clientpulse-api',
      ready: true,
      checks: {
        database: 'ok',
      },
    });
    expect(body['timestamp']).toBeDefined();
  });

  it('unhandled routes should return standard error structure', async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];
    const response = await request(server)
      .get('/api/v1/non-existent-route')
      .expect(404);

    const body = response.body as Record<string, unknown>;
    expect(body).toMatchObject({
      success: false,
      statusCode: 404,
      path: '/api/v1/non-existent-route',
    });
    expect(body['timestamp']).toBeDefined();
  });
});
