import Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),
  PORT: Joi.number().port().default(3100),
  // Base URL used to build links to uploaded files. Use the Mac's LAN IP
  // (e.g. http://192.168.0.13:3100) so images load on a real phone.
  PUBLIC_URL: Joi.string().uri().default('http://localhost:3100'),

  DB_HOST: Joi.string().default('localhost'),
  DB_PORT: Joi.number().port().default(5440),
  DB_USER: Joi.string().required(),
  DB_PASSWORD: Joi.string().required(),
  DB_NAME: Joi.string().required(),

  JWT_ACCESS_SECRET: Joi.string().min(32).required(),
  // Short-lived on purpose (max 1 day): sockets are disconnected when it expires.
  JWT_ACCESS_TTL_SECONDS: Joi.number()
    .integer()
    .min(60)
    .max(86_400)
    .default(900),
  REFRESH_TOKEN_TTL_DAYS: Joi.number().integer().min(1).default(30),

  // Comma-separated OAuth client IDs (web, iOS, Android) whose ID tokens are accepted.
  GOOGLE_CLIENT_IDS: Joi.string().allow('').default(''),
  // Web client secret; only needed for server-side auth code exchange.
  GOOGLE_CLIENT_SECRET: Joi.string().allow('').default(''),

  EXPO_ACCESS_TOKEN: Joi.string().allow('').default(''),

  ORDER_PAYMENT_TIMEOUT_MINUTES: Joi.number().integer().min(1).default(15),
});
