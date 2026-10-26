import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  type Relation,
} from 'typeorm';
import { Order } from '../../orders/entities/order.entity.js';

/** Mirrors Stripe's PaymentIntent.status. */
export enum PaymentStatus {
  RequiresPaymentMethod = 'requires_payment_method',
  RequiresConfirmation = 'requires_confirmation',
  RequiresAction = 'requires_action',
  Processing = 'processing',
  RequiresCapture = 'requires_capture',
  Canceled = 'canceled',
  Succeeded = 'succeeded',
}

/** The customer can still pay this PaymentIntent (PaymentSheet can be shown again). */
export const PAYABLE_STATUSES = [
  PaymentStatus.RequiresPaymentMethod,
  PaymentStatus.RequiresConfirmation,
  PaymentStatus.RequiresAction,
];

/** Money may already be on its way: the order must not be cancelled. */
export const IN_FLIGHT_STATUSES = [
  PaymentStatus.Processing,
  PaymentStatus.RequiresCapture,
  PaymentStatus.Succeeded,
];

/** One Stripe PaymentIntent. An order can have several if earlier ones were cancelled. */
@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid' })
  orderId: string;

  @ManyToOne(() => Order, (order) => order.payments, { onDelete: 'CASCADE' })
  @JoinColumn()
  order: Relation<Order>;

  @Column({ type: 'varchar', unique: true })
  stripePaymentIntentId: string;

  /** VND. */
  @Column({ type: 'int' })
  amount: number;

  @Column({ type: 'varchar', length: 3 })
  currency: string;

  @Column({ type: 'enum', enum: PaymentStatus, enumName: 'payment_status' })
  status: PaymentStatus;

  /** Total refunded so far, from Stripe's charge.amount_refunded. */
  @Column({ type: 'int', default: 0 })
  amountRefunded: number;

  /** Stripe's message for the last failed attempt, e.g. "Your card was declined." */
  @Column({ type: 'text', nullable: true })
  lastError: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
