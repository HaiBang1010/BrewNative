import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Store } from './entities/store.entity.js';
import {
  AdminStoresController,
  StoresController,
} from './stores.controller.js';
import { StoresService } from './stores.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Store])],
  controllers: [StoresController, AdminStoresController],
  providers: [StoresService],
  exports: [StoresService],
})
export class StoresModule {}
