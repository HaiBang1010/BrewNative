import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { CreateStoreDto, UpdateStoreDto } from './dto/store.dto.js';
import { Store } from './entities/store.entity.js';

@Injectable()
export class StoresService {
  constructor(
    @InjectRepository(Store) private readonly stores: Repository<Store>,
  ) {}

  list(includeInactive = false): Promise<Store[]> {
    return this.stores.find({
      where: includeInactive ? {} : { isActive: true },
      order: { name: 'ASC' },
    });
  }

  async get(id: string, includeInactive = false): Promise<Store> {
    const store = await this.stores.findOneBy(
      includeInactive ? { id } : { id, isActive: true },
    );
    if (!store) throw new NotFoundException('Store not found');
    return store;
  }

  create(dto: CreateStoreDto): Promise<Store> {
    return this.stores.save(this.stores.create(dto));
  }

  /** Stores are never deleted (orders reference them); set isActive=false instead. */
  async update(id: string, dto: UpdateStoreDto): Promise<Store> {
    const store = await this.get(id, true);
    return this.stores.save(this.stores.merge(store, dto));
  }
}
