import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../user/entities/user.entity';
import { Subscription, SubscriptionPlan, SubscriptionStatus } from '../subscription/entities/subscription.entity';
import { PlanType, BillingInterval } from './dto/checkout-query.dto';

export interface SimplifiedSubscription {
  id: string;
  status: string;
  current_period_end: number;
  cancel_at_period_end: boolean;
}

export interface SimplifiedInvoice {
  id: string;
  subscription: string;
}

@Injectable()
export class SubscriptionService {
  private readonly paymentLinks: Record<string, string>;

  constructor(
    private configService: ConfigService,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Subscription)
    private subscriptionRepository: Repository<Subscription>,
  ) {
    this.paymentLinks = {
      [`${PlanType.BASIC}_${BillingInterval.MONTHLY}`]:
        this.configService.get<string>('BASIC_MONTHLY_LINK') ?? 'https://buy.stripe.com/eVa2c70FygOM6ac00z',
      [`${PlanType.BASIC}_${BillingInterval.YEARLY}`]:
        this.configService.get<string>('BASIC_YEARLY_LINK') ?? 'https://buy.stripe.com/bIY2c7ag8dCA1TW6oY',
      [`${PlanType.BUSINESS}_${BillingInterval.MONTHLY}`]:
        this.configService.get<string>('BUSINESS_MONTHLY_LINK') ?? 'https://buy.stripe.com/dR6g2Xag82XWgOQ6oZ',
      [`${PlanType.BUSINESS}_${BillingInterval.YEARLY}`]:
        this.configService.get<string>('BUSINESS_YEARLY_LINK') ?? 'https://buy.stripe.com/dR603Zag88iggOQ9Bc',
    };
  }

  /**
   * Create a new subscription record
   */
  async createSubscriptionRecord(
    userId: string,
    planType: PlanType,
    billingInterval: BillingInterval,
  ): Promise<Subscription> {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // Check if user already has a pending subscription
    const pendingSubscription = await this.subscriptionRepository.findOne({
      where: {
        userId,
        status: SubscriptionStatus.INCOMPLETE,
      },
      order: {
        createdAt: 'DESC',
      },
    });

    if (pendingSubscription) {
      // Update existing pending subscription
      pendingSubscription.plan = planType === PlanType.BASIC ? SubscriptionPlan.BASIC : SubscriptionPlan.BUSINESS;
      pendingSubscription.isYearly = billingInterval === BillingInterval.YEARLY;
      return this.subscriptionRepository.save(pendingSubscription);
    }

    // Create new subscription
    const subscription = this.subscriptionRepository.create({
      user,
      userId,
      plan: planType === PlanType.BASIC ? SubscriptionPlan.BASIC : SubscriptionPlan.BUSINESS,
      isYearly: billingInterval === BillingInterval.YEARLY,
      status: SubscriptionStatus.INCOMPLETE,
      stripeSubscriptionId: '', // This will remain empty until manual update
      currentPeriodEnd: new Date(
        Date.now() + (billingInterval === BillingInterval.YEARLY ? 365 : 30) * 24 * 60 * 60 * 1000,
      ), // 1 month or 1 year from now
      cancelAtPeriodEnd: false,
    });

    return this.subscriptionRepository.save(subscription);
  }

  /**
   * Get user's active subscription
   */
  async getUserActiveSubscription(userId: string): Promise<Subscription | null> {
    return this.subscriptionRepository.findOne({
      where: {
        userId,
        status: SubscriptionStatus.ACTIVE,
      },
    });
  }

  async getAllSubscriptions(): Promise<Subscription[]> {
    return this.subscriptionRepository.find({
      order: {
        createdAt: 'DESC',
      },
    });
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload: Buffer, _: string): any {
    console.warn('STRIPE_WEBHOOK_SECRET is not defined. This is only for development.');
    console.warn('In production, webhook events should be verified with Stripe.');

    try {
      return JSON.parse(payload.toString());
    } catch (error) {
      console.error('Failed to parse webhook payload:', error);
      throw new Error('Invalid webhook payload format');
    }
  }

  /**
   * Update subscription status manually
   * This is used for admin functions until webhooks are implemented
   */
  async manuallyUpdateSubscriptionStatus(
    subscriptionId: string,
    status: SubscriptionStatus,
    stripeSubscriptionId?: string,
  ): Promise<Subscription> {
    const subscription = await this.subscriptionRepository.findOne({
      where: { id: subscriptionId },
    });

    if (!subscription) {
      throw new NotFoundException(`Subscription with ID ${subscriptionId} not found`);
    }

    subscription.status = status;

    if (stripeSubscriptionId) {
      subscription.stripeSubscriptionId = stripeSubscriptionId;
    }

    // If activating subscription, update the period end date
    if (status === SubscriptionStatus.ACTIVE) {
      subscription.currentPeriodEnd = new Date(Date.now() + (subscription.isYearly ? 365 : 30) * 24 * 60 * 60 * 1000);
    }

    return this.subscriptionRepository.save(subscription);
  }

  /**
   * Process subscription updates (simplified version)
   */
  async processSubscriptionUpdate(subscription: SimplifiedSubscription): Promise<boolean> {
    console.log(`Processing subscription update for ${subscription.id}`);
    console.warn('This is a mock implementation. In production, use Stripe API.');

    // Without real Stripe integration, this function will mostly log the intent
    console.log(`Would update subscription ${subscription.id} to status: ${subscription.status}`);

    return true;
  }

  /**
   * Process successful invoice payments (simplified version)
   */
  async processInvoicePaid(invoice: SimplifiedInvoice): Promise<boolean> {
    console.log(`Processing paid invoice ${invoice.id}`);
    console.warn('This is a mock implementation. In production, use Stripe API.');

    // Without real Stripe integration, this function will mostly log the intent
    console.log(`Would mark subscription ${invoice.subscription} as active`);

    return true;
  }

  /**
   * Process failed invoice payments (simplified version)
   */
  async processInvoicePaymentFailed(invoice: SimplifiedInvoice): Promise<boolean> {
    console.log(`Processing failed invoice payment ${invoice.id}`);
    console.warn('This is a mock implementation. In production, use Stripe API.');

    // Without real Stripe integration, this function will mostly log the intent
    console.log(`Would mark subscription ${invoice.subscription} as past_due`);

    return true;
  }

  /**
   * Get payment link based on plan type and billing interval
   */
  getPaymentLink(planType: PlanType, billingInterval: BillingInterval): string {
    return (
      this.paymentLinks[`${planType}_${billingInterval}`] ||
      this.paymentLinks[`${PlanType.BASIC}_${BillingInterval.MONTHLY}`]
    );
  }

  /**
   * Mark subscription as awaiting confirmation
   * Call this when user returns from payment page
   */
  async markSubscriptionAwaitingConfirmation(userId: string): Promise<Subscription | null> {
    const pendingSubscription = await this.subscriptionRepository.findOne({
      where: {
        userId,
        status: SubscriptionStatus.INCOMPLETE,
      },
      order: {
        createdAt: 'DESC',
      },
    });

    if (!pendingSubscription) {
      return null;
    }

    pendingSubscription.status = SubscriptionStatus.INCOMPLETE_EXPIRED;
    await this.subscriptionRepository.save(pendingSubscription);
    return pendingSubscription;
  }
}
