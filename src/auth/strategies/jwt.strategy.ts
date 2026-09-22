import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AuthenticatedUser } from '../decorators/current-user.decorator.js';
import { Role } from '@prisma/client';

export interface JwtPayload {
  sub: string;
  organizationId: string;
  role: Role;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const secret = configService.get<string>('jwt.accessSecret');
    if (!secret) {
      throw new Error('JWT access secret is not configured');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    if (!payload.sub || !payload.organizationId || !payload.role) {
      throw new UnauthorizedException('Invalid token payload');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        organizationId: true,
        clientId: true,
      },
    });

    if (!user || user.organizationId !== payload.organizationId) {
      throw new UnauthorizedException(
        'User no longer exists or tenant mismatch',
      );
    }

    return user;
  }
}
