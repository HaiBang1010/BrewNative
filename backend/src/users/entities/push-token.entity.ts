import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  type Relation,
} from 'typeorm';
import { User } from './user.entity.js';

export enum DevicePlatform {
  Ios = 'ios',
  Android = 'android',
}

/** One Expo push token per device. A user signed in on several devices has several rows. */
@Entity('push_tokens')
export class PushToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn()
  user: Relation<User>;

  /** ExponentPushToken[...] */
  @Column({ type: 'varchar', unique: true })
  token: string;

  @Column({ type: 'enum', enum: DevicePlatform, enumName: 'device_platform' })
  platform: DevicePlatform;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
