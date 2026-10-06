import 'dotenv/config';

const nodeEnv =
  process.env.NODE_ENV || 'development';

const databaseUrl =
  process.env.DATABASE_URL || '';

if (!databaseUrl) {
  throw new Error(
    'DATABASE_URL is required.',
  );
}

if (
  nodeEnv === 'production' &&
  !process.env.CORS_ORIGIN
) {
  throw new Error(
    'CORS_ORIGIN is required in production.',
  );
}

export const config = {
  port:
    parseInt(
      process.env.BACKEND_PORT ||
        process.env.PORT ||
        '8001',
      10,
    ),

  nodeEnv,

  corsOrigin:
    process.env.CORS_ORIGIN ||
    'http://localhost:3000',

  database: {
    url: databaseUrl,
  },

  core: {
    apiUrl: process.env.CORE_API_URL || '',
    serviceToken: process.env.CONTROL_SERVICE_TOKEN || '',
  },

  groq: {
    apiKey:
      process.env.GROQ_API_KEY || '',
  },
};
