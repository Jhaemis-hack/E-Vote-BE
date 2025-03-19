import { Controller, Get, Query, Redirect, UseGuards, Req } from "@nestjs/common";
import { SubscriptionService } from "./subscription.service";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from "@nestjs/swagger";
import { CheckoutQueryDto, PlanType, BillingInterval } from "./dto/checkout-query.dto";
import { SubscriptionPlansResponseDto } from "./dto/subscription-plan.dto";
import { AuthGuard } from "../../guards/auth.guard";
import { Request } from "express";

@ApiTags("Subscription")
@Controller("subscription")
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Get("checkout")
  @Redirect()
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Redirect to Stripe payment link" })
  @ApiResponse({
    status: 302,
    description: "Redirects to Stripe payment link",
  })
  async getCheckoutLink(@Query() query: CheckoutQueryDto, @Req() request: Request) {
    const userId = request["user"].id;

    await this.subscriptionService.createSubscriptionRecord(
      userId,
      query.plan || PlanType.BASIC,
      query.interval || BillingInterval.MONTHLY,
    );

    const url = this.subscriptionService.getPaymentLink(
      query.plan || PlanType.BASIC,
      query.interval || BillingInterval.MONTHLY,
    );

    return { url };
  }

  @Get("plans")
  @ApiOperation({ summary: "Get available subscription plans" })
  @ApiResponse({
    status: 200,
    description: "Returns available subscription plans",
    type: SubscriptionPlansResponseDto,
  })
  getAvailablePlans(): SubscriptionPlansResponseDto {
    return {
      plans: [
        {
          type: PlanType.BASIC,
          name: "Basic Plan Resolve",
          intervals: [
            {
              type: BillingInterval.MONTHLY,
              name: "Monthly",
              url: `/api/v1/subscription/checkout?plan=${PlanType.BASIC}&interval=${BillingInterval.MONTHLY}`,
            },
            {
              type: BillingInterval.YEARLY,
              name: "Yearly",
              url: `/api/v1/subscription/checkout?plan=${PlanType.BASIC}&interval=${BillingInterval.YEARLY}`,
            },
          ],
        },
        {
          type: PlanType.BUSINESS,
          name: "Business Plan Resolve",
          intervals: [
            {
              type: BillingInterval.MONTHLY,
              name: "Monthly",
              url: `/api/v1/subscription/checkout?plan=${PlanType.BUSINESS}&interval=${BillingInterval.MONTHLY}`,
            },
            {
              type: BillingInterval.YEARLY,
              name: "Yearly",
              url: `/api/v1/subscription/checkout?plan=${PlanType.BUSINESS}&interval=${BillingInterval.YEARLY}`,
            },
          ],
        },
      ],
    };
  }

  @Get('my-subscription')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user subscription' })
  async getCurrentSubscription(@Req() request: Request) {
    const userId = request['user'].id;
    const subscription = await this.subscriptionService.getUserActiveSubscription(userId);
    
    if (!subscription) {
      return { 
        hasActiveSubscription: false,
        message: 'No active subscription found'
      };
    }
    
    return {
      hasActiveSubscription: true,
      subscription: {
        id: subscription.id,
        plan: subscription.plan,
        interval: subscription.isYearly ? 'yearly' : 'monthly',
        status: subscription.status,
        currentPeriodEnd: subscription.currentPeriodEnd,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      }
    };
  }
}