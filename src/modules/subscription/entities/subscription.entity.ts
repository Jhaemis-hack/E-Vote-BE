import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn,
  } from "typeorm"
  import { User } from "../../user/entities/user.entity"
  
  export enum SubscriptionStatus {
    ACTIVE = "active",
    CANCELED = "canceled",
    PAST_DUE = "past_due",
    UNPAID = "unpaid",
    TRIALING = "trialing",
    INCOMPLETE = "incomplete",
    INCOMPLETE_EXPIRED = "incomplete_expired",
  }
  
  export enum SubscriptionPlan {
    BASIC = "basic",
    BUSINESS = "business",
  }
  
  @Entity("subscriptions")
  export class Subscription {
    @PrimaryGeneratedColumn("uuid")
    id: string
  
    @Column({ nullable: true })
    stripeSubscriptionId: string
  
    @Column({ nullable: true })
    stripeCustomerId: string
  
    @Column({
      type: "enum",
      enum: SubscriptionPlan,
      default: SubscriptionPlan.BASIC,
    })
    plan: SubscriptionPlan
  
    @Column({ default: false })
    isYearly: boolean
  
    @Column({
      type: "enum",
      enum: SubscriptionStatus,
      default: SubscriptionStatus.INCOMPLETE,
    })
    status: SubscriptionStatus
  
    @Column({ nullable: true, type: "timestamp" })
    currentPeriodEnd: Date
  
    @Column({ default: false })
    cancelAtPeriodEnd: boolean
  
    @ManyToOne(
      () => User,
      (user) => user.subscriptions,
    )
    @JoinColumn({ name: "userId" })
    user: User
  
    @Column()
    userId: string
  
    @CreateDateColumn()
    createdAt: Date
  
    @UpdateDateColumn()
    updatedAt: Date
  }
  
  