import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators/auth.decorators.js';
import { ImageUpload, uploadedFileUrl } from '../uploads/image-upload.js';
import { UserRole } from '../users/entities/user-role.enum.js';
import {
  CreateCategoryDto,
  CreateOptionDto,
  CreateOptionGroupDto,
  CreateProductDto,
  ListProductsQueryDto,
  UpdateCategoryDto,
  UpdateOptionDto,
  UpdateOptionGroupDto,
  UpdateProductDto,
} from './dto/menu.dto.js';
import { MenuService } from './menu.service.js';

@ApiTags('admin / menu')
@ApiBearerAuth()
@Roles(UserRole.Admin)
@Controller('admin/categories')
export class AdminCategoriesController {
  constructor(private readonly menu: MenuService) {}

  @Get()
  list() {
    return this.menu.listCategories();
  }

  @Post()
  create(@Body() dto: CreateCategoryDto) {
    return this.menu.createCategory(dto);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.menu.updateCategory(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.menu.deleteCategory(id);
  }
}

@ApiTags('admin / menu')
@ApiBearerAuth()
@Roles(UserRole.Admin)
@Controller('admin/products')
export class AdminProductsController {
  constructor(
    private readonly menu: MenuService,
    private readonly config: ConfigService,
  ) {}

  @Get()
  list(@Query() query: ListProductsQueryDto) {
    return this.menu.listProducts(query.categoryId);
  }

  @Get(':id')
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.menu.getProduct(id);
  }

  @Post()
  create(@Body() dto: CreateProductDto) {
    return this.menu.createProduct(dto);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.menu.updateProduct(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.menu.deleteProduct(id);
  }

  /** multipart/form-data, field `file`. */
  @Post(':id/image')
  @ImageUpload('products')
  uploadImage(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const url = uploadedFileUrl(
      this.config.getOrThrow<string>('PUBLIC_URL'),
      'products',
      file,
    );
    return this.menu.setProductImage(id, url);
  }

  @Post(':id/option-groups')
  createOptionGroup(
    @Param('id', ParseUUIDPipe) productId: string,
    @Body() dto: CreateOptionGroupDto,
  ) {
    return this.menu.createOptionGroup(productId, dto);
  }
}

@ApiTags('admin / menu')
@ApiBearerAuth()
@Roles(UserRole.Admin)
@Controller('admin/option-groups')
export class AdminOptionGroupsController {
  constructor(private readonly menu: MenuService) {}

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOptionGroupDto,
  ) {
    return this.menu.updateOptionGroup(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.menu.deleteOptionGroup(id);
  }

  @Post(':id/options')
  createOption(
    @Param('id', ParseUUIDPipe) optionGroupId: string,
    @Body() dto: CreateOptionDto,
  ) {
    return this.menu.createOption(optionGroupId, dto);
  }
}

@ApiTags('admin / menu')
@ApiBearerAuth()
@Roles(UserRole.Admin)
@Controller('admin/options')
export class AdminOptionsController {
  constructor(private readonly menu: MenuService) {}

  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateOptionDto) {
    return this.menu.updateOption(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.menu.deleteOption(id);
  }
}
