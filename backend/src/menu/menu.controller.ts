import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/auth.decorators.js';
import { MenuService } from './menu.service.js';

@ApiTags('menu')
@Public()
@Controller()
export class MenuController {
  constructor(private readonly menu: MenuService) {}

  /** All categories with their products (no options). */
  @Get('menu')
  getMenu() {
    return this.menu.getMenu();
  }

  /** One product with its option groups and options. */
  @Get('products/:id')
  getProduct(@Param('id', ParseUUIDPipe) id: string) {
    return this.menu.getProduct(id);
  }
}
