import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Public, Roles } from '../common/decorators/auth.decorators.js';
import { UserRole } from '../users/entities/user-role.enum.js';
import { CreateStoreDto, UpdateStoreDto } from './dto/store.dto.js';
import { StoresService } from './stores.service.js';

@ApiTags('stores')
@Public()
@Controller('stores')
export class StoresController {
  constructor(private readonly stores: StoresService) {}

  @Get()
  list() {
    return this.stores.list();
  }

  @Get(':id')
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.stores.get(id);
  }
}

@ApiTags('admin / stores')
@ApiBearerAuth()
@Roles(UserRole.Admin)
@Controller('admin/stores')
export class AdminStoresController {
  constructor(private readonly stores: StoresService) {}

  /** Includes inactive stores. */
  @Get()
  list() {
    return this.stores.list(true);
  }

  @Post()
  create(@Body() dto: CreateStoreDto) {
    return this.stores.create(dto);
  }

  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateStoreDto) {
    return this.stores.update(id, dto);
  }
}
