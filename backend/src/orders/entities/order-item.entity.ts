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
import { Product } from '../../menu/entities/product.entity.js';
import { OrderItemOption } from './order-item-option.entity.js';
import { Order } from './order.entity.js';

/** Name and prices are copied from the menu at order time, so later menu edits don't change old orders. */
@Entity('order_items')
export class OrderItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid' })
  orderId: string;

  @ManyToOne(() => Order, (order) => order.items, { onDelete: 'CASCADE' })
  @JoinColumn()
  order: Relation<Order>;

  /** Null if the product was deleted later. */
  @Column({ type: 'uuid', nullable: true })
  productId: string | null;

  @ManyToOne(() => Product, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn()
  product: Relation<Product> | null;

  @Column({ type: 'varchar' })
  productName: string;

  @Column({ type: 'varchar', nullable: true })
  productImageUrl: string | null;

  /** Base price + selected option deltas, per unit. VND. */
  @Column({ type: 'int' })
  unitPrice: number;

  @Column({ type: 'int' })
  quantity: number;

  /** unitPrice * quantity. VND. */
  @Column({ type: 'int' })
  lineTotal: number;

  @OneToMany(() => OrderItemOption, (option) => option.orderItem, {
    cascade: ['insert'],
  })
  options: Relation<OrderItemOption[]>;
}
