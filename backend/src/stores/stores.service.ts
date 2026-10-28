import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ServerEvent,
  type CatalogUpdatedEvent,
} from '../realtime/realtime.events.js';
import { RealtimeService } from '../realtime/realtime.service.js';
import type { CreateStoreDto, UpdateStoreDto } from './dto/store.dto.js';
import { Store } from './entities/store.entity.js';

@Injectable()
export class StoresService {
  constructor(
    @InjectRepository(Store) private readonly stores: Repository<Store>,
    private readonly realtime: RealtimeService,
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

  async create(dto: CreateStoreDto): Promise<Store> {
    const store = await this.stores.save(this.stores.create(dto));
    this.storesChanged();
    return store;
  }

  /** Stores are never deleted (orders reference them); set isActive=false instead. */
  async update(id: string, dto: UpdateStoreDto): Promise<Store> {
    const store = await this.get(id, true);
    const saved = await this.stores.save(this.stores.merge(store, dto));
    this.storesChanged();
    return saved;
  }

  /** Tells every connected app to refetch the stores (stores:updated). */
  private storesChanged(): void {
    this.realtime.emitToAllSoon(
      ServerEvent.StoresUpdated,
      (): CatalogUpdatedEvent => ({ changedAt: new Date().toISOString() }),
    );
  }
}
