import type { DataSourceOptions } from 'typeorm';
import { SnakeNamingStrategy } from './snake-naming.strategy.js';

type DbEnv = {
  DB_HOST: string;
  DB_PORT: number | string;
  DB_USER: string;
  DB_PASSWORD: string;
  DB_NAME: string;
};

/** Connection settings shared by the Nest app and the TypeORM CLI (migrations, seed). */
export function buildDatabaseOptions(env: DbEnv) {
  return {
    type: 'postgres',
    host: env.DB_HOST,
    port: Number(env.DB_PORT),
    username: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
    namingStrategy: new SnakeNamingStrategy(),
    // gen_random_uuid() is built into Postgres 13+, no uuid-ossp extension needed.
    uuidExtension: 'pgcrypto',
    // Schema changes go through migrations, never auto-sync.
    synchronize: false,
  } satisfies DataSourceOptions;
}
