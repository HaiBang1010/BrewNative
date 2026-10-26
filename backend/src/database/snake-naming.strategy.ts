import { DefaultNamingStrategy, type NamingStrategyInterface } from 'typeorm';

const toSnake = (value: string) =>
  value
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1_$2')
    .toLowerCase();

/** Maps camelCase entity properties to snake_case table columns. */
export class SnakeNamingStrategy
  extends DefaultNamingStrategy
  implements NamingStrategyInterface
{
  override columnName(
    propertyName: string,
    customName: string | undefined,
    embeddedPrefixes: string[],
  ): string {
    return toSnake([...embeddedPrefixes, customName ?? propertyName].join('_'));
  }

  override relationName(propertyName: string): string {
    return toSnake(propertyName);
  }

  override joinColumnName(
    relationName: string,
    referencedColumnName: string,
  ): string {
    return toSnake(`${relationName}_${referencedColumnName}`);
  }

  override joinTableColumnName(
    tableName: string,
    propertyName: string,
    columnName?: string,
  ): string {
    return toSnake(`${tableName}_${columnName ?? propertyName}`);
  }
}
