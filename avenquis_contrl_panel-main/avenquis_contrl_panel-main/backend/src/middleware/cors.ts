import cors from 'cors';
import { config } from '../config/index.js';

export function configureCors() {
  const allowedOrigins = new Set(
    [
      config.corsOrigin,
      'avenquis-core://app',
      'avenquis-control://app',
      'http://localhost:3000',
  'http://localhost:3001',
      'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
    ].filter(Boolean),
  );

  return cors({
    origin(origin, callback) {
      if (!origin) {
        callback(null, true);
        return;
      }

      if (allowedOrigins.has(origin)) {
        callback(null, true);
        return;
      }

      callback(
        new Error(
          `Origin '${origin}' is not allowed by CORS policy.`,
        ),
      );
    },

    credentials: true,

    methods: [
      'GET',
      'POST',
      'PUT',
      'PATCH',
      'DELETE',
      'OPTIONS',
    ],

    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Client-Application',
      'X-Correlation-Id',
    ],

    exposedHeaders: [
      'X-Correlation-Id',
    ],
  });
}

