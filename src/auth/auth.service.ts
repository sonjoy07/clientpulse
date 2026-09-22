import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService, type JwtSignOptions } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service.js';
import { LoginDto } from './dto/login.dto.js';
import { RefreshTokenDto } from './dto/refresh-token.dto.js';
import { JwtPayload } from './strategies/jwt.strategy.js';
import { AuthenticatedUser } from './decorators/current-user.decorator.js';

export interface LoginResponse {
  user: AuthenticatedUser;
  accessToken: string;
  refreshToken: string;
}

export interface RefreshResponse {
  accessToken: string;
}

export interface LogoutResponse {
  success: boolean;
  message: string;
}

interface DecodedRefreshToken {
  sub: string;
  exp: number;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly accessSecret: string;
  private readonly accessExpiresIn: string;
  private readonly refreshSecret: string;
  private readonly refreshExpiresIn: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    this.accessSecret =
      this.configService.get<string>('jwt.accessSecret') ||
      'dev-access-secret-clientpulse-minimum-32-chars-long';
    this.accessExpiresIn =
      this.configService.get<string>('jwt.accessExpiresIn') || '15m';
    this.refreshSecret =
      this.configService.get<string>('jwt.refreshSecret') ||
      'dev-refresh-secret-clientpulse-minimum-32-chars-long';
    this.refreshExpiresIn =
      this.configService.get<string>('jwt.refreshExpiresIn') || '7d';
  }

  async login(loginDto: LoginDto): Promise<LoginResponse> {
    const user = await this.prisma.user.findFirst({
      where: { email: loginDto.email.toLowerCase().trim() },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isMatch = await bcrypt.compare(loginDto.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload: JwtPayload = {
      sub: user.id,
      organizationId: user.organizationId,
      role: user.role,
    };

    const accessToken = await this.generateAccessToken(payload);
    const refreshToken = await this.generateAndStoreRefreshToken(user.id);

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        organizationId: user.organizationId,
      },
      accessToken,
      refreshToken,
    };
  }

  async refresh(refreshTokenDto: RefreshTokenDto): Promise<RefreshResponse> {
    let decoded: DecodedRefreshToken;

    try {
      decoded = await this.jwtService.verifyAsync<DecodedRefreshToken>(
        refreshTokenDto.refreshToken,
        { secret: this.refreshSecret },
      );
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const tokenHash = this.hashToken(refreshTokenDto.refreshToken);

    const storedToken = await this.prisma.refreshToken.findFirst({
      where: {
        tokenHash,
        userId: decoded.sub,
      },
      include: {
        user: true,
      },
    });

    if (!storedToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (storedToken.revokedAt) {
      throw new UnauthorizedException('Refresh token has been revoked');
    }

    if (new Date() > storedToken.expiresAt) {
      throw new UnauthorizedException('Refresh token has expired');
    }

    const payload: JwtPayload = {
      sub: storedToken.user.id,
      organizationId: storedToken.user.organizationId,
      role: storedToken.user.role,
    };

    const accessToken = await this.generateAccessToken(payload);

    return { accessToken };
  }

  async logout(refreshTokenDto: RefreshTokenDto): Promise<LogoutResponse> {
    const tokenHash = this.hashToken(refreshTokenDto.refreshToken);

    await this.prisma.refreshToken.updateMany({
      where: {
        tokenHash,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });

    return {
      success: true,
      message: 'Logged out successfully',
    };
  }

  private async generateAccessToken(payload: JwtPayload): Promise<string> {
    return this.jwtService.signAsync(payload, {
      secret: this.accessSecret,
      expiresIn: this.accessExpiresIn as JwtSignOptions['expiresIn'],
    });
  }

  private async generateAndStoreRefreshToken(userId: string): Promise<string> {
    const jti = crypto.randomUUID();
    const token = await this.jwtService.signAsync(
      { sub: userId, jti },
      {
        secret: this.refreshSecret,
        expiresIn: this.refreshExpiresIn as JwtSignOptions['expiresIn'],
      },
    );

    const decoded = this.jwtService.decode<{ exp?: number }>(token);
    const expiresAt = decoded?.exp
      ? new Date(decoded.exp * 1000)
      : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const tokenHash = this.hashToken(token);

    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt,
      },
    });

    return token;
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}
