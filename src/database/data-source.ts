import { ConfigService } from '@nestjs/config';
import { existsSync } from 'fs';
import { join } from 'path';
import { DataSource } from 'typeorm';
import { buildDataSourceOptions } from './typeorm.config';

// typeorm CLI는 Nest 밖에서 실행되므로 .env를 직접 읽는다.
if (existsSync('.env')) {
  process.loadEnvFile('.env');
}

export default new DataSource({
  ...buildDataSourceOptions(new ConfigService()),
  entities: [join(__dirname, '..', '**', '*.entity.{ts,js}')],
});
