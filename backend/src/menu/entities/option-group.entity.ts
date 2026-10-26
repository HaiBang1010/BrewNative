import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  type Relation,
} from 'typeorm';
import { Option } from './option.entity.js';
import { Product } from './product.entity.js';

/** A choice on a product, e.g. "Size" (pick exactly 1) or "Topping" (pick 0-3). */
@Entity('option_groups')
export class OptionGroup {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid' })
  productId: string;

  @ManyToOne(() => Product, (product) => product.optionGroups, {
    onDelete: 'CASCADE',
  })
  @JoinColumn()
  product: Relation<Product>;

  @Column({ type: 'varchar' })
  name: string;

  /** 0 = optional. */
  @Column({ type: 'int', default: 0 })
  minSelect: number;

  @Column({ type: 'int', default: 1 })
  maxSelect: number;

  @Column({ type: 'int', default: 0 })
  sortOrder: number;

  @OneToMany(() => Option, (option) => option.optionGroup)
  options: Relation<Option[]>;
}
