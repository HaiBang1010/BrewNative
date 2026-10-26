import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

/**
 * Webhook events already handled. Stripe may deliver the same event more than
 * once; inserting its id first makes the second delivery a no-op.
 */
@Entity('stripe_events')
export class StripeEvent {
  /** evt_... */
  @PrimaryColumn({ type: 'varchar' })
  id: string;

  @Column({ type: 'varchar' })
  type: string;

  @CreateDateColumn({ type: 'timestamptz' })
  processedAt: Date;
}
