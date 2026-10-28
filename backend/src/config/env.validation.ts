import Joi from 'joi';

/** Required unless DATABASE_URL gives the whole connection. */
const requiredWithoutUrl = () =>
  Joi.string().when('DATABASE_URL', {
    is: Joi.string().min(1),
    then: Joi.optional(),
    otherwise: Joi.required(),
  });

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),
  PORT: Joi.number().port().default(3100),
  // Base URL used to build links to uploaded files. Use the Mac's LAN IP
  // (e.g. http://192.168.0.13:3100) so images load on a real phone.
  // On Render it defaults to the service's own https://….onrender.com URL.
  PUBLIC_URL: Joi.string()
    .uri()
    .default(process.env.RENDER_EXTERNAL_URL || 'http://localhost:3100'),

  // Either one connection string (hosted Postgres such as Neon, with
  // ?sslmode=require) or the separate DB_* values (local Docker database).
  DATABASE_URL: Joi.string()
    .uri({ scheme: ['postgres', 'postgresql'] })
    .allow(''),
  DB_HOST: Joi.string().default('localhost'),
  DB_PORT: Joi.number().port().default(5440),
  DB_USER: requiredWithoutUrl(),
  DB_PASSWORD: requiredWithoutUrl(),
  DB_NAME: requiredWithoutUrl(),

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

  // Empty until payments are wired up; the prefixes catch keys pasted into the wrong slot.
  STRIPE_SECRET_KEY: Joi.string()
    .pattern(/^sk_(test|live)_/)
    .allow('')
    .default(''),
  STRIPE_WEBHOOK_SECRET: Joi.string()
    .pattern(/^whsec_/)
    .allow('')
    .default(''),
  // Optional: returned to the app with each PaymentIntent so it doesn't need its own copy.
  STRIPE_PUBLISHABLE_KEY: Joi.string()
    .pattern(/^pk_(test|live)_/)
    .allow('')
    .default(''),

  ORDER_PAYMENT_TIMEOUT_MINUTES: Joi.number().integer().min(1).default(15),
});
