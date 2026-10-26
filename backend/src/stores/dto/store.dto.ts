import { PartialType } from '@nestjs/swagger';
import {
  IsBoolean,
  IsLatitude,
  IsLongitude,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  Length,
} from 'class-validator';
import type { OpeningHours } from '../entities/store.entity.js';

export class CreateStoreDto {
  @IsString()
  @Length(1, 100)
  name: string;

  @IsString()
  @Length(1, 255)
  address: string;

  @IsLatitude()
  latitude: number;

  @IsLongitude()
  longitude: number;

  @IsOptional()
  @IsString()
  @Length(6, 20)
  phone?: string | null;

  @IsOptional()
  @IsUrl({ require_tld: false })
  imageUrl?: string | null;

  /** e.g. { "mon": { "open": "07:00", "close": "22:00" }, "sun": null } */
  @IsOptional()
  @IsObject()
  openingHours?: OpeningHours | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateStoreDto extends PartialType(CreateStoreDto) {}
