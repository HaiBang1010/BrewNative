import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  type Relation,
} from 'typeorm';
import { User } from '../../users/entities/user.entity.js';
import { OrderStatus } from './order-status.enum.js';
import { Order } from './order.entity.js';

@Entity('order_status_history')
export class OrderStatusHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid' })
  orderId: string;

  @ManyToOne(() => Order, (order) => order.statusHistory, {
    onDelete: 'CASCADE',
  })
  @JoinColumn()
  order: Relation<Order>;

  /** Null for the first entry (order created). */
  @Column({
    type: 'enum',
    enum: OrderStatus,
    enumName: 'order_status',
    nullable: true,
  })
  fromStatus: OrderStatus | null;

  @Column({ type: 'enum', enum: OrderStatus, enumName: 'order_status' })
  toStatus: OrderStatus;

  /** Null when the system changed it (payment webhook, timeout). */
  @Column({ type: 'uuid', nullable: true })
  changedById: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn()
  changedBy: Relation<User> | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
