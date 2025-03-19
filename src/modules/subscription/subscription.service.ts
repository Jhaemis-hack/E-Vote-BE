import { Injectable, NotFoundException } from "@nestjs/common";
import Stripe from "stripe";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { User } from "../user/entities/user.entity";
import { Subscription, SubscriptionPlan, SubscriptionStatus } from "../subscription/entities/subscription.entity";
import { PlanType, BillingInterval } from "./dto/checkout-query.dto";

@Injectable()
export class SubscriptionService {
  private stripe: Stripe;
  private readonly paymentLinks: Record<string, string>;

  constructor(
    private configService: ConfigService,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Subscription)
    private subscriptionRepository: Repository<Subscription>
  ) {
    const apiKey = this.configService.get<string>("STRIPE_SECRET_KEY");
    if (!apiKey) {
      console.warn("STRIPE_SECRET_KEY is not defined");
    }
    this.stripe = new Stripe(apiKey || "", {
      apiVersion: "2025-02-24.acacia",
    });

    this.paymentLinks = {
      [`${PlanType.BASIC}_${BillingInterval.MONTHLY}`]: this.configService.get<string>("BASIC_MONTHLY_LINK") ?? "default_basic_monthly_link",
      [`${PlanType.BASIC}_${BillingInterval.YEARLY}`]: this.configService.get<string>("BASIC_YEARLY_LINK") ?? "default_basic_yearly_link",
      [`${PlanType.BUSINESS}_${BillingInterval.MONTHLY}`]: this.configService.get<string>("BUSINESS_MONTHLY_LINK") ?? "default_business_monthly_link",
      [`${PlanType.BUSINESS}_${BillingInterval.YEARLY}`]: this.configService.get<string>("BUSINESS_YEARLY_LINK") ?? "default_business_yearly_link",
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

    const subscription = this.subscriptionRepository.create({
      user,
      userId,
      plan: planType === PlanType.BASIC ? SubscriptionPlan.BASIC : SubscriptionPlan.BUSINESS,
      isYearly: billingInterval === BillingInterval.YEARLY,
      status: SubscriptionStatus.INCOMPLETE,
      stripeSubscriptionId: "",
      currentPeriodEnd: new Date(),
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
        user: { id: userId },
        status: SubscriptionStatus.ACTIVE,
      },
    });
  }

  /**
   * Verify Stripe webhook signature
   */
  verifyWebhookSignature(payload: Buffer, signature: string): Stripe.Event {
    const webhookSecret = this.configService.get<string>("STRIPE_WEBHOOK_SECRET");

    if (!webhookSecret) {
      console.warn("STRIPE_WEBHOOK_SECRET is not defined. Skipping signature verification.");
      return JSON.parse(payload.toString());
    }

    return this.stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  }

  /**
   * Process subscription updates (created, updated, deleted)
   */
  async processSubscriptionUpdate(subscription: Stripe.Subscription) {
    console.log(`Processing subscription update for ${subscription.id}`);

    const existingSubscription = await this.subscriptionRepository.findOne({
      where: { stripeSubscriptionId: subscription.id },
    });

    if (!existingSubscription) {
      console.warn(`Subscription with Stripe ID ${subscription.id} not found`);
      return false;
    }

    existingSubscription.status = subscription.status as SubscriptionStatus;
    existingSubscription.currentPeriodEnd = new Date(subscription.current_period_end * 1000);
    existingSubscription.cancelAtPeriodEnd = subscription.cancel_at_period_end;

    await this.subscriptionRepository.save(existingSubscription);
    return true;
  }

  /**
   * Process successful invoice payments
   */
  async processInvoicePaid(invoice: Stripe.Invoice) {
    console.log(`Processing paid invoice ${invoice.id}`);

    const subscriptionId = invoice.subscription as string;
    const existingSubscription = await this.subscriptionRepository.findOne({
      where: { stripeSubscriptionId: subscriptionId },
    });

    if (!existingSubscription) {
      console.warn(`Subscription with Stripe ID ${subscriptionId} not found`);
      return false;
    }

    existingSubscription.status = SubscriptionStatus.ACTIVE;
    await this.subscriptionRepository.save(existingSubscription);
    return true;
  }

  /**
   * Process failed invoice payments
   */
  async processInvoicePaymentFailed(invoice: Stripe.Invoice) {
    console.log(`Processing failed invoice payment ${invoice.id}`);

    const subscriptionId = invoice.subscription as string;
    const existingSubscription = await this.subscriptionRepository.findOne({
      where: { stripeSubscriptionId: subscriptionId },
    });

    if (!existingSubscription) {
      console.warn(`Subscription with Stripe ID ${subscriptionId} not found`);
      return false;
    }

    existingSubscription.status = SubscriptionStatus.PAST_DUE;
    await this.subscriptionRepository.save(existingSubscription);
    return true;
  }

  /**
   * Get payment link based on plan type and billing interval
   */
  getPaymentLink(planType: PlanType, billingInterval: BillingInterval): string {
    return this.paymentLinks[`${planType}_${billingInterval}`] || this.paymentLinks[`${PlanType.BASIC}_${BillingInterval.MONTHLY}`];
  }
}