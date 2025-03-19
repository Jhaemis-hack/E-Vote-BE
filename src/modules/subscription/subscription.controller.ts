import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Redirect,
  UseGuards,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { SubscriptionService } from './subscription.service';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { CheckoutQueryDto, PlanType, BillingInterval } from './dto/checkout-query.dto';
import { SubscriptionPlansResponseDto } from './dto/subscription-plan.dto';
import { AuthGuard } from '../../guards/auth.guard';
import { Request } from 'express';
import { JwtPayload } from '../../shared/interfaces/jwt-payload.interface';
import { Subscription, SubscriptionStatus } from './entities/subscription.entity';

class UpdateSubscriptionStatusDto {
  status: SubscriptionStatus;
  stripeSubscriptionId?: string;
}

@ApiTags('Subscription')
@Controller('subscription')
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}
  //checkout
  @Get('checkout')
  @Redirect()
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Redirect to Stripe payment link' })
  @ApiResponse({
    status: 302,
    description: 'Redirects to Stripe payment link',
  })
  async getCheckoutLink(@Query() query: CheckoutQueryDto, @Req() request: Request & { user: JwtPayload }) {
    const user = request.user;
    if (!user || !user.sub) {
      throw new UnauthorizedException('User not authenticated');
    }
    const userId = user.sub;

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
  //get plans
  @Get('plans')
  @ApiOperation({ summary: 'Get available subscription plans' })
  @ApiResponse({
    status: 200,
    description: 'Returns available subscription plans',
    type: SubscriptionPlansResponseDto,
  })
  getAvailablePlans(): SubscriptionPlansResponseDto {
    return {
      plans: [
        {
          type: PlanType.BASIC,
          name: 'Basic Plan Resolve',
          intervals: [
            {
              type: BillingInterval.MONTHLY,
              name: 'Monthly',
              url: `/api/v1/subscription/checkout?plan=${PlanType.BASIC}&interval=${BillingInterval.MONTHLY}`,
            },
            {
              type: BillingInterval.YEARLY,
              name: 'Yearly',
              url: `/api/v1/subscription/checkout?plan=${PlanType.BASIC}&interval=${BillingInterval.YEARLY}`,
            },
          ],
        },
        {
          type: PlanType.BUSINESS,
          name: 'Business Plan Resolve',
          intervals: [
            {
              type: BillingInterval.MONTHLY,
              name: 'Monthly',
              url: `/api/v1/subscription/checkout?plan=${PlanType.BUSINESS}&interval=${BillingInterval.MONTHLY}`,
            },
            {
              type: BillingInterval.YEARLY,
              name: 'Yearly',
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
  async getCurrentSubscription(@Req() request: Request & { user: JwtPayload }) {
    const user = request.user;
    if (!user || !user.sub) {
      throw new UnauthorizedException('User not authenticated');
    }
    const userId = user.sub;
    const subscription = await this.subscriptionService.getUserActiveSubscription(userId);

    if (!subscription) {
      return {
        hasActiveSubscription: false,
        message: 'No active subscription found',
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
      },
    };
  }

  @Get('payment-return')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Handle user return from payment page' })
  @ApiResponse({ status: 200, description: 'Payment status' })
  async handlePaymentReturn(@Req() request: Request & { user: JwtPayload }) {
    const user = request.user;
    if (!user || !user.sub) {
      throw new UnauthorizedException('User not authenticated');
    }

    const subscription = await this.subscriptionService.markSubscriptionAwaitingConfirmation(user.sub);

    if (!subscription) {
      return {
        status: 'no_subscription',
        message: 'No pending subscription found',
      };
    }

    return {
      status: 'awaiting_confirmation',
      message: 'Your subscription is awaiting confirmation',
      subscription: {
        id: subscription.id,
        plan: subscription.plan,
        interval: subscription.isYearly ? 'yearly' : 'monthly',
      },
    };
  }

  @Get('admin/all')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all subscriptions (Admin only)' })
  @ApiResponse({ status: 200, description: 'List of all subscriptions' })
  async getAllSubscriptions() {
    const subscriptions = await this.subscriptionService.getAllSubscriptions();

    return {
      subscriptions: subscriptions.map(sub => ({
        id: sub.id,
        userId: sub.userId,
        plan: sub.plan,
        isYearly: sub.isYearly,
        status: sub.status,
        createdAt: sub.createdAt,
        currentPeriodEnd: sub.currentPeriodEnd,
      })),
    };
  }

  @Post('admin/:id/status')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Manually update subscription status (Admin only)' })
  @ApiParam({ name: 'id', description: 'Subscription ID' })
  @ApiResponse({ status: 200, description: 'Subscription status updated' })
  @ApiResponse({ status: 404, description: 'Subscription not found' })
  async updateSubscriptionStatus(@Param('id') id: string, @Body() updateDto: UpdateSubscriptionStatusDto) {
    const updatedSubscription = await this.subscriptionService.manuallyUpdateSubscriptionStatus(
      id,
      updateDto.status,
      updateDto.stripeSubscriptionId,
    );

    return {
      message: 'Subscription status updated successfully',
      subscription: {
        id: updatedSubscription.id,
        status: updatedSubscription.status,
        plan: updatedSubscription.plan,
        isYearly: updatedSubscription.isYearly,
        currentPeriodEnd: updatedSubscription.currentPeriodEnd,
        stripeSubscriptionId: updatedSubscription.stripeSubscriptionId,
      },
    };
  }
}
