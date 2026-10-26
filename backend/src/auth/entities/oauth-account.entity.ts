import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  type Relation,
} from 'typeorm';
import { User } from '../../users/entities/user.entity.js';

export enum OAuthProvider {
  Google = 'google',
}

@Entity('oauth_accounts')
@Unique(['provider', 'providerUserId'])
export class OAuthAccount {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn()
  user: Relation<User>;

  @Column({ type: 'enum', enum: OAuthProvider, enumName: 'oauth_provider' })
  provider: OAuthProvider;

  /** The `sub` claim of the provider's ID token. */
  @Column({ type: 'varchar' })
  providerUserId: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
