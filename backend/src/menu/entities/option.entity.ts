import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  type Relation,
} from 'typeorm';
import { OptionGroup } from './option-group.entity.js';

@Entity('options')
export class Option {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid' })
  optionGroupId: string;

  @ManyToOne(() => OptionGroup, (group) => group.options, {
    onDelete: 'CASCADE',
  })
  @JoinColumn()
  optionGroup: Relation<OptionGroup>;

  @Column({ type: 'varchar' })
  name: string;

  /** Added to the product price, VND. Can be 0. */
  @Column({ type: 'int', default: 0 })
  priceDelta: number;

  @Column({ type: 'boolean', default: true })
  isAvailable: boolean;

  @Column({ type: 'int', default: 0 })
  sortOrder: number;
}
