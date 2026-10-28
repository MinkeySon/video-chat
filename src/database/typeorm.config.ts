import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { join } from 'path';
import { DataSourceOptions } from 'typeorm';

/**
 * 앱·CLI 공통 PostgreSQL 접속 옵션을 만든다.
 * 스키마는 마이그레이션으로만 관리하므로 synchronize는 끈다.
 */
export function buildDataSourceOptions(
  config: ConfigService,
): DataSourceOptions {
  return {
    type: 'postgres',
    host: config.getOrThrow<string>('DB_HOST'),
    port: Number(config.getOrThrow<string>('DB_PORT')),
    username: config.getOrThrow<string>('DB_USERNAME'),
    password: config.getOrThrow<string>('DB_PASSWORD'),
    database: config.getOrThrow<string>('DB_DATABASE'),
    synchronize: false,
    migrationsRun: false,
    // PG13+ 내장 gen_random_uuid() 사용 (uuid-ossp 확장 불필요)
    uuidExtension: 'pgcrypto',
    migrations: [join(__dirname, 'migrations', '*.{ts,js}')],
  };
}

/**
 * Nest `TypeOrmModule.forRootAsync`용 옵션. Entity는 `forFeature` 등록분을 자동 로드한다.
 */
export function buildTypeOrmOptions(
  config: ConfigService,
): TypeOrmModuleOptions {
  return {
    ...buildDataSourceOptions(config),
    autoLoadEntities: true,
  };
}
