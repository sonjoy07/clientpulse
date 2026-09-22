import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthService } from './auth.service.js';
import type {
  LoginResponse,
  RefreshResponse,
  LogoutResponse,
} from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';
import { RefreshTokenDto } from './dto/refresh-token.dto.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import { RolesGuard } from './guards/roles.guard.js';
import { Roles } from './decorators/roles.decorator.js';
import { CurrentUser } from './decorators/current-user.decorator.js';
import type { AuthenticatedUser } from './decorators/current-user.decorator.js';
import { Role } from '@prisma/client';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto): Promise<LoginResponse> {
    return this.authService.login(loginDto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Body() refreshTokenDto: RefreshTokenDto,
  ): Promise<RefreshResponse> {
    return this.authService.refresh(refreshTokenDto);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Body() refreshTokenDto: RefreshTokenDto,
  ): Promise<LogoutResponse> {
    return this.authService.logout(refreshTokenDto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getMe(@CurrentUser() user: AuthenticatedUser): AuthenticatedUser {
    return user;
  }

  @Get('admin-test')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  getAdminTest(@CurrentUser() user: AuthenticatedUser) {
    return {
      message: 'Access granted for admin role',
      userId: user.id,
      role: user.role,
    };
  }
}
