import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  type Relation,
} from 'typeorm';
import { Option } from '../../menu/entities/option.entity.js';
import { OrderItem } from './order-item.entity.js';

@Entity('order_item_options')
export class OrderItemOption {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid' })
  orderItemId: string;

  @ManyToOne(() => OrderItem, (item) => item.options, { onDelete: 'CASCADE' })
  @JoinColumn()
  orderItem: Relation<OrderItem>;

  /** Null if the option was deleted later. */
  @Column({ type: 'uuid', nullable: true })
  optionId: string | null;

  @ManyToOne(() => Option, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn()
  option: Relation<Option> | null;

  /** e.g. "Size". */
  @Column({ type: 'varchar' })
  groupName: string;

  /** e.g. "L". */
  @Column({ type: 'varchar' })
  optionName: string;

  @Column({ type: 'int' })
  priceDelta: number;
}
