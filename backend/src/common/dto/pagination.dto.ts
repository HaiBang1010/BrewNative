import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class PaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;
}

export type Paginated<T> = {
  items: T[];
  total: number;
  page: number;
  limit: number;
};

export function paginate<T>(
  items: T[],
  total: number,
  query: PaginationQueryDto,
): Paginated<T> {
  return { items, total, page: query.page, limit: query.limit };
}
