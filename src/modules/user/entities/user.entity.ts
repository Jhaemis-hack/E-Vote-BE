import { AbstractBaseEntity } from '../../../entities/base.entity';
import { Election } from '../../election/entities/election.entity';
import { Subscription } from '../../subscription/entities/subscription.entity';
import { Column, Entity, OneToMany } from 'typeorm';

// Define enums
export enum PaymentType {
  FREE = 'free',
  BUSINESS = 'business',
  BASIC = 'basic',
}

export enum BillingInterval {
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
}

@Entity({ name: 'admin' })
export class User extends AbstractBaseEntity {
  @Column({ nullable: true })
  first_name: string;

  @Column({ nullable: true })
  last_name: string;

  @Column({ unique: true })
  email: string;

  @Column({ nullable: true })
  password: string;

  @Column({ default: false })
  is_verified: boolean;

  @Column({ nullable: true, unique: true })
  google_id: string;

  @Column({ nullable: true })
  profile_picture: string;

  @Column({ type: 'enum', enum: PaymentType, default: PaymentType.FREE })
  payment_type: PaymentType;

  @Column({ type: 'enum', enum: BillingInterval, default: BillingInterval.MONTHLY })
  billing_Interval: BillingInterval;

  @OneToMany(() => Election, election => election.created_by_user)
  created_elections: Election[];

  @OneToMany(() => Subscription, subscription => subscription.user)
  subscriptions: Subscription[];
}
