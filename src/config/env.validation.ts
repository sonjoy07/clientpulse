import { plainToInstance } from 'class-transformer';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  validateSync,
} from 'class-validator';

export enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

export class EnvironmentVariables {
  @IsEnum(Environment)
  @IsOptional()
  NODE_ENV: Environment = Environment.Development;

  @IsNumber()
  @IsOptional()
  PORT: number = 4000;

  @IsString()
  DATABASE_URL!: string;

  @IsString()
  @IsOptional()
  JWT_ACCESS_SECRET?: string;

  @IsString()
  @IsOptional()
  JWT_ACCESS_EXPIRES_IN: string = '15m';

  @IsString()
  @IsOptional()
  JWT_REFRESH_SECRET?: string;

  @IsString()
  @IsOptional()
  JWT_REFRESH_EXPIRES_IN: string = '7d';

  @IsString()
  @IsOptional()
  AI_PROVIDER: string = 'mock';

  @IsString()
  @IsOptional()
  AI_API_KEY?: string;

  @IsString()
  @IsOptional()
  AI_MODEL: string = 'gpt-4o-mini';

  @IsString()
  @IsOptional()
  AI_BASE_URL: string = 'https://api.openai.com/v1';

  @IsNumber()
  @IsOptional()
  AI_REPORT_MAX_TOKENS: number = 2000;

  @IsNumber()
  @IsOptional()
  AI_REPORT_TEMPERATURE: number = 0.3;

  @IsString()
  @IsOptional()
  REDIS_HOST: string = 'localhost';

  @IsNumber()
  @IsOptional()
  REDIS_PORT: number = 6379;

  @IsString()
  @IsOptional()
  REDIS_PASSWORD?: string;
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  const customErrors: string[] = [];

  // 1. Database URL validation
  const dbUrl =
    (config.DATABASE_URL_TEST as string) ||
    (config.DATABASE_URL as string) ||
    validatedConfig.DATABASE_URL;
  if (!dbUrl || typeof dbUrl !== 'string' || dbUrl.trim() === '') {
    customErrors.push('DATABASE_URL must be provided and non-empty');
  }

  // 2. Redis validation
  if (!validatedConfig.REDIS_HOST || validatedConfig.REDIS_HOST.trim() === '') {
    customErrors.push('REDIS_HOST must be provided and non-empty');
  }
  if (!validatedConfig.REDIS_PORT || isNaN(validatedConfig.REDIS_PORT)) {
    customErrors.push('REDIS_PORT must be a valid number');
  }

  // 3. JWT Secret validation in Production
  if (validatedConfig.NODE_ENV === Environment.Production) {
    if (
      !validatedConfig.JWT_ACCESS_SECRET ||
      validatedConfig.JWT_ACCESS_SECRET.length < 32
    ) {
      customErrors.push(
        'JWT_ACCESS_SECRET is required in production and must be at least 32 characters long',
      );
    }
    if (
      !validatedConfig.JWT_REFRESH_SECRET ||
      validatedConfig.JWT_REFRESH_SECRET.length < 32
    ) {
      customErrors.push(
        'JWT_REFRESH_SECRET is required in production and must be at least 32 characters long',
      );
    }
  }

  // 4. AI Provider validation
  if (validatedConfig.AI_PROVIDER === 'openai') {
    if (
      !validatedConfig.AI_API_KEY ||
      validatedConfig.AI_API_KEY.trim() === ''
    ) {
      customErrors.push(
        'AI_API_KEY must be provided when AI_PROVIDER is set to "openai"',
      );
    }
  }

  if (errors.length > 0 || customErrors.length > 0) {
    const errorDetails = [
      ...errors.map((e) => Object.values(e.constraints || {}).join(', ')),
      ...customErrors,
    ].join('; ');
    throw new Error(
      `Environment configuration validation failed: ${errorDetails}`,
    );
  }

  return validatedConfig;
}
