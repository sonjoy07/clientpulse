export default () => ({
  environment: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '4000', 10),
  database: {
    url: process.env.DATABASE_URL_TEST || process.env.DATABASE_URL,
  },
  jwt: {
    accessSecret:
      process.env.JWT_ACCESS_SECRET || 'default-jwt-access-secret-fallback',
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshSecret:
      process.env.JWT_REFRESH_SECRET || 'default-jwt-refresh-secret-fallback',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
  ai: {
    provider: process.env.AI_PROVIDER || 'mock',
    apiKey: process.env.AI_API_KEY || '',
    model: process.env.AI_MODEL || 'gpt-4o-mini',
    baseUrl: process.env.AI_BASE_URL || 'https://api.openai.com/v1',
    maxTokens: parseInt(process.env.AI_REPORT_MAX_TOKENS || '2000', 10),
    temperature: parseFloat(process.env.AI_REPORT_TEMPERATURE || '0.3'),
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
  },
});
