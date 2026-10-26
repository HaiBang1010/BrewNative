import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { slugify } from '../common/utils/slugify.js';
import type {
  CreateCategoryDto,
  CreateOptionDto,
  CreateOptionGroupDto,
  CreateProductDto,
  UpdateCategoryDto,
  UpdateOptionDto,
  UpdateOptionGroupDto,
  UpdateProductDto,
} from './dto/menu.dto.js';
import { Category } from './entities/category.entity.js';
import { OptionGroup } from './entities/option-group.entity.js';
import { Option } from './entities/option.entity.js';
import { Product } from './entities/product.entity.js';

@Injectable()
export class MenuService {
  constructor(
    @InjectRepository(Category)
    private readonly categories: Repository<Category>,
    @InjectRepository(Product) private readonly products: Repository<Product>,
    @InjectRepository(OptionGroup)
    private readonly optionGroups: Repository<OptionGroup>,
    @InjectRepository(Option) private readonly options: Repository<Option>,
  ) {}

  // ---------- Public ----------

  /** Categories with their products. Options are only in the product detail. */
  getMenu(): Promise<Category[]> {
    return this.categories.find({
      relations: { products: true },
      order: {
        sortOrder: 'ASC',
        name: 'ASC',
        products: { sortOrder: 'ASC', name: 'ASC' },
      },
    });
  }

  async getProduct(id: string): Promise<Product> {
    const product = await this.products.findOne({
      where: { id },
      relations: { category: true, optionGroups: { options: true } },
      order: {
        optionGroups: { sortOrder: 'ASC', options: { sortOrder: 'ASC' } },
      },
    });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  // ---------- Categories ----------

  listCategories(): Promise<Category[]> {
    return this.categories.find({ order: { sortOrder: 'ASC', name: 'ASC' } });
  }

  async createCategory(dto: CreateCategoryDto): Promise<Category> {
    const slug = dto.slug ?? slugify(dto.name);
    await this.assertSlugFree(slug);
    return this.categories.save(this.categories.create({ ...dto, slug }));
  }

  async updateCategory(id: string, dto: UpdateCategoryDto): Promise<Category> {
    const category = await this.findCategory(id);
    if (dto.slug && dto.slug !== category.slug) {
      await this.assertSlugFree(dto.slug);
    }
    return this.categories.save(this.categories.merge(category, dto));
  }

  async deleteCategory(id: string): Promise<void> {
    await this.findCategory(id);
    if (await this.products.existsBy({ categoryId: id })) {
      throw new ConflictException(
        'Category still has products; move or delete them first',
      );
    }
    await this.categories.delete(id);
  }

  // ---------- Products ----------

  listProducts(categoryId?: string): Promise<Product[]> {
    return this.products.find({
      where: categoryId ? { categoryId } : {},
      order: { sortOrder: 'ASC', name: 'ASC' },
    });
  }

  async createProduct(dto: CreateProductDto): Promise<Product> {
    await this.findCategory(dto.categoryId, BadRequestException);
    return this.products.save(this.products.create(dto));
  }

  async updateProduct(id: string, dto: UpdateProductDto): Promise<Product> {
    const product = await this.findProduct(id);
    if (dto.categoryId && dto.categoryId !== product.categoryId) {
      await this.findCategory(dto.categoryId, BadRequestException);
    }
    return this.products.save(this.products.merge(product, dto));
  }

  /** Past orders keep their copied name/price; their product_id becomes null. */
  async deleteProduct(id: string): Promise<void> {
    await this.findProduct(id);
    await this.products.delete(id);
  }

  async setProductImage(id: string, imageUrl: string): Promise<Product> {
    const product = await this.findProduct(id);
    product.imageUrl = imageUrl;
    return this.products.save(product);
  }

  // ---------- Option groups ----------

  async createOptionGroup(
    productId: string,
    dto: CreateOptionGroupDto,
  ): Promise<OptionGroup> {
    await this.findProduct(productId);
    assertSelectRange(dto.minSelect, dto.maxSelect);
    return this.optionGroups.save(
      this.optionGroups.create({ ...dto, productId }),
    );
  }

  async updateOptionGroup(
    id: string,
    dto: UpdateOptionGroupDto,
  ): Promise<OptionGroup> {
    const group = await this.findOptionGroup(id);
    const merged = this.optionGroups.merge(group, dto);
    assertSelectRange(merged.minSelect, merged.maxSelect);
    return this.optionGroups.save(merged);
  }

  async deleteOptionGroup(id: string): Promise<void> {
    await this.findOptionGroup(id);
    await this.optionGroups.delete(id);
  }

  // ---------- Options ----------

  async createOption(
    optionGroupId: string,
    dto: CreateOptionDto,
  ): Promise<Option> {
    await this.findOptionGroup(optionGroupId);
    return this.options.save(this.options.create({ ...dto, optionGroupId }));
  }

  async updateOption(id: string, dto: UpdateOptionDto): Promise<Option> {
    const option = await this.options.findOneBy({ id });
    if (!option) throw new NotFoundException('Option not found');
    return this.options.save(this.options.merge(option, dto));
  }

  async deleteOption(id: string): Promise<void> {
    const { affected } = await this.options.delete(id);
    if (!affected) throw new NotFoundException('Option not found');
  }

  // ---------- Helpers ----------

  private async findCategory(
    id: string,
    NotFound: new (message: string) => Error = NotFoundException,
  ): Promise<Category> {
    const category = await this.categories.findOneBy({ id });
    if (!category) throw new NotFound('Category not found');
    return category;
  }

  private async findProduct(id: string): Promise<Product> {
    const product = await this.products.findOneBy({ id });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  private async findOptionGroup(id: string): Promise<OptionGroup> {
    const group = await this.optionGroups.findOneBy({ id });
    if (!group) throw new NotFoundException('Option group not found');
    return group;
  }

  private async assertSlugFree(slug: string): Promise<void> {
    if (await this.categories.existsBy({ slug })) {
      throw new ConflictException(`Slug "${slug}" is already used`);
    }
  }
}

function assertSelectRange(minSelect: number, maxSelect: number): void {
  if (minSelect > maxSelect) {
    throw new BadRequestException('minSelect cannot be greater than maxSelect');
  }
}
