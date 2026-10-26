import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PushToken } from '../users/entities/push-token.entity.js';
import { PushService } from './push.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([PushToken])],
  providers: [PushService],
  exports: [PushService],
})
export class PushModule {}
