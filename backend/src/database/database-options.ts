import type { DataSourceOptions } from 'typeorm';
import { SnakeNamingStrategy } from './snake-naming.strategy.js';

type DbEnv = {
  /** Wins over the DB_* values when set, e.g. Neon's postgres://…?sslmode=require. */
  DATABASE_URL?: string;
  DB_HOST?: string;
  DB_PORT?: number | string;
  DB_USER?: string;
  DB_PASSWORD?: string;
  DB_NAME?: string;
};

/** Connection settings shared by the Nest app and the TypeORM CLI (migrations, seed). */
export function buildDatabaseOptions(env: DbEnv) {
  // The URL carries its own SSL setting (sslmode=require), read by the pg driver.
  const connection = env.DATABASE_URL
    ? { url: env.DATABASE_URL }
    : {
        host: env.DB_HOST,
        port: Number(env.DB_PORT),
        username: env.DB_USER,
        password: env.DB_PASSWORD,
        database: env.DB_NAME,
      };
  return {
    type: 'postgres',
    ...connection,
    namingStrategy: new SnakeNamingStrategy(),
    // gen_random_uuid() is built into Postgres 13+, no uuid-ossp extension needed.
    uuidExtension: 'pgcrypto',
    // Schema changes go through migrations, never auto-sync.
    synchronize: false,
  } satisfies DataSourceOptions;
}
