import { join } from 'node:path';
import { DataSource } from 'typeorm';
import { buildDatabaseOptions } from './database-options.js';

// Used by the TypeORM CLI and the seed script, which run outside Nest.
// Always run them from the compiled dist/ (see the migration:* scripts).
try {
  process.loadEnvFile();
} catch {
  // No .env file: rely on variables already in the environment.
}

const env = process.env as Record<string, string>;

export default new DataSource({
  ...buildDatabaseOptions({
    DB_HOST: env.DB_HOST ?? 'localhost',
    DB_PORT: env.DB_PORT ?? 5440,
    DB_USER: env.DB_USER,
    DB_PASSWORD: env.DB_PASSWORD,
    DB_NAME: env.DB_NAME,
  }),
  entities: [join(import.meta.dirname, '..', '**', '*.entity.js')],
  migrations: [join(import.meta.dirname, 'migrations', '*.js')],
});
