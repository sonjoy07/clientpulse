import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { Role } from '@prisma/client';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: {
    user: { findFirst: jest.Mock };
    refreshToken: {
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
    };
  };
  let jwtService: {
    signAsync: jest.Mock;
    verifyAsync: jest.Mock;
    decode: jest.Mock;
  };

  const mockUser = {
    id: 'user-uuid-1',
    name: 'Alice Admin',
    email: 'admin@acme.example.com',
    passwordHash: '',
    role: Role.ADMIN,
    organizationId: 'org-uuid-1',
  };

  beforeAll(async () => {
    mockUser.passwordHash = await bcrypt.hash('Password123!', 10);
  });

  beforeEach(async () => {
    prisma = {
      user: {
        findFirst: jest.fn(),
      },
      refreshToken: {
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
    };

    jwtService = {
      signAsync: jest
        .fn()
        .mockImplementation((payload) =>
          Promise.resolve(`token-for-${JSON.stringify(payload)}`),
        ),
      verifyAsync: jest.fn(),
      decode: jest
        .fn()
        .mockReturnValue({ exp: Math.floor(Date.now() / 1000) + 3600 }),
    };

    const configService = {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === 'jwt.accessSecret') return 'access-secret-123';
        if (key === 'jwt.accessExpiresIn') return '15m';
        if (key === 'jwt.refreshSecret') return 'refresh-secret-123';
        if (key === 'jwt.refreshExpiresIn') return '7d';
        return undefined;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('login', () => {
    it('should authenticate user and return tokens without passwordHash', async () => {
      prisma.user.findFirst.mockResolvedValue(mockUser);
      prisma.refreshToken.create.mockResolvedValue({});

      const result = await service.login({
        email: 'admin@acme.example.com',
        password: 'Password123!',
      });

      expect(result.user).toEqual({
        id: mockUser.id,
        name: mockUser.name,
        email: mockUser.email,
        role: mockUser.role,
        organizationId: mockUser.organizationId,
      });
      expect(result).not.toHaveProperty('passwordHash');
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
    });

    it('should throw UnauthorizedException if email not found', async () => {
      prisma.user.findFirst.mockResolvedValue(null);

      await expect(
        service.login({
          email: 'unknown@acme.example.com',
          password: 'Password123!',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if password incorrect', async () => {
      prisma.user.findFirst.mockResolvedValue(mockUser);

      await expect(
        service.login({
          email: 'admin@acme.example.com',
          password: 'WrongPassword!',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refresh', () => {
    it('should throw UnauthorizedException if token verification fails', async () => {
      jwtService.verifyAsync.mockRejectedValue(new Error('Invalid token'));

      await expect(
        service.refresh({ refreshToken: 'invalid-token' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if token is revoked', async () => {
      jwtService.verifyAsync.mockResolvedValue({
        sub: 'user-uuid-1',
        exp: 9999999999,
      });
      prisma.refreshToken.findFirst.mockResolvedValue({
        id: 'token-id-1',
        userId: 'user-uuid-1',
        revokedAt: new Date(),
        expiresAt: new Date(Date.now() + 100000),
        user: mockUser,
      });

      await expect(
        service.refresh({ refreshToken: 'revoked-token' }),
      ).rejects.toThrow('Refresh token has been revoked');
    });

    it('should return new accessToken for valid stored token', async () => {
      jwtService.verifyAsync.mockResolvedValue({
        sub: 'user-uuid-1',
        exp: 9999999999,
      });
      prisma.refreshToken.findFirst.mockResolvedValue({
        id: 'token-id-1',
        userId: 'user-uuid-1',
        revokedAt: null,
        expiresAt: new Date(Date.now() + 100000),
        user: mockUser,
      });

      const result = await service.refresh({ refreshToken: 'valid-token' });
      expect(result.accessToken).toBeDefined();
    });
  });

  describe('logout', () => {
    it('should mark refresh token as revoked', async () => {
      prisma.refreshToken.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.logout({ refreshToken: 'any-token' });
      expect(result.success).toBe(true);
      expect(prisma.refreshToken.updateMany).toHaveBeenCalled();
    });
  });
});
