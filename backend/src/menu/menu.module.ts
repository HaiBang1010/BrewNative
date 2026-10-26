import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  AdminCategoriesController,
  AdminOptionGroupsController,
  AdminOptionsController,
  AdminProductsController,
} from './admin-menu.controller.js';
import { Category } from './entities/category.entity.js';
import { OptionGroup } from './entities/option-group.entity.js';
import { Option } from './entities/option.entity.js';
import { Product } from './entities/product.entity.js';
import { MenuController } from './menu.controller.js';
import { MenuService } from './menu.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Category, Product, OptionGroup, Option])],
  controllers: [
    MenuController,
    AdminCategoriesController,
    AdminProductsController,
    AdminOptionGroupsController,
    AdminOptionsController,
  ],
  providers: [MenuService],
})
export class MenuModule {}
