import { PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Length,
  Matches,
  Max,
  Min,
} from 'class-validator';

export class CreateCategoryDto {
  @IsString()
  @Length(1, 100)
  name: string;

  /** Generated from name if omitted. */
  @IsOptional()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'slug may only contain lowercase letters, digits and dashes',
  })
  slug?: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  imageUrl?: string | null;

  @IsOptional()
  @IsInt()
  sortOrder?: number;
}

export class UpdateCategoryDto extends PartialType(CreateCategoryDto) {}

export class CreateProductDto {
  @IsUUID()
  categoryId: string;

  @IsString()
  @Length(1, 150)
  name: string;

  @IsOptional()
  @IsString()
  @Length(0, 2000)
  description?: string | null;

  @IsOptional()
  @IsUrl({ require_tld: false })
  imageUrl?: string | null;

  /** VND. */
  @IsInt()
  @Min(0)
  @Max(100_000_000)
  basePrice: number;

  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;

  @IsOptional()
  @IsInt()
  sortOrder?: number;
}

export class UpdateProductDto extends PartialType(CreateProductDto) {}

export class ListProductsQueryDto {
  @IsOptional()
  @IsUUID()
  categoryId?: string;
}

export class CreateOptionGroupDto {
  @IsString()
  @Length(1, 100)
  name: string;

  /** 0 = optional, 1 = must pick at least one. */
  @IsInt()
  @Min(0)
  @Max(20)
  minSelect: number;

  @IsInt()
  @Min(1)
  @Max(20)
  maxSelect: number;

  @IsOptional()
  @IsInt()
  sortOrder?: number;
}

export class UpdateOptionGroupDto extends PartialType(CreateOptionGroupDto) {}

export class CreateOptionDto {
  @IsString()
  @Length(1, 100)
  name: string;

  /** VND added to the product price. */
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(10_000_000)
  priceDelta: number;

  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;

  @IsOptional()
  @IsInt()
  sortOrder?: number;
}

export class UpdateOptionDto extends PartialType(CreateOptionDto) {}
