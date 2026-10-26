import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  type Relation,
} from 'typeorm';
import { User } from '../../users/entities/user.entity.js';

/** One support chat per customer. Any staff/admin can reply. */
@Entity('conversations')
export class Conversation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', unique: true })
  customerId: string;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn()
  customer: Relation<User>;

  @Index()
  @Column({ type: 'timestamptz', nullable: true })
  lastMessageAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  customerLastReadAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  staffLastReadAt: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
