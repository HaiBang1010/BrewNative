import {
  AfterInsert,
  AfterLoad,
  Column,
  CreateDateColumn,
  Entity,
  Generated,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  type Relation,
} from 'typeorm';
import { Store } from '../../stores/entities/store.entity.js';
import { User } from '../../users/entities/user.entity.js';
import { OrderItem } from './order-item.entity.js';
import { OrderStatusHistory } from './order-status-history.entity.js';
import { OrderStatus } from './order-status.enum.js';

@Entity('orders')
@Index(['userId', 'createdAt'])
@Index(['storeId', 'status'])
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Running number, shown to customers as `code` (BRW-1001). */
  @Column({ type: 'int', unique: true })
  @Generated('increment')
  number: number;

  /** Not a column: derived from `number`. */
  code: string;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn()
  user: Relation<User>;

  @Column({ type: 'uuid' })
  storeId: string;

  @ManyToOne(() => Store, { onDelete: 'RESTRICT' })
  @JoinColumn()
  store: Relation<Store>;

  @Column({
    type: 'enum',
    enum: OrderStatus,
    enumName: 'order_status',
    default: OrderStatus.PendingPayment,
  })
  status: OrderStatus;

  /** VND. */
  @Column({ type: 'int' })
  subtotal: number;

  /** VND. Equal to subtotal until discounts/fees exist. */
  @Column({ type: 'int' })
  total: number;

  @Column({ type: 'varchar', length: 3, default: 'vnd' })
  currency: string;

  @Column({ type: 'text', nullable: true })
  note: string | null;

  @OneToMany(() => OrderItem, (item) => item.order, { cascade: ['insert'] })
  items: Relation<OrderItem[]>;

  @OneToMany(() => OrderStatusHistory, (entry) => entry.order, {
    cascade: ['insert'],
  })
  statusHistory: Relation<OrderStatusHistory[]>;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @AfterLoad()
  @AfterInsert()
  setCode() {
    if (this.number) this.code = `BRW-${1000 + this.number}`;
  }
}
