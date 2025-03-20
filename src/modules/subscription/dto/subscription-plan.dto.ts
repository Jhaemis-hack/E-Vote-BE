import { ApiProperty } from '@nestjs/swagger';

class PlanIntervalDto {
  @ApiProperty({ example: 'monthly', description: 'Billing interval type' })
  type: string;

  @ApiProperty({ example: 'Monthly', description: 'Display name for the billing interval' })
  name: string;

  @ApiProperty({
    example: '/api/v1/subscription/checkout?plan=basic&interval=monthly',
    description: 'URL to redirect to for checkout',
  })
  url: string;
}

class SubscriptionPlanDto {
  @ApiProperty({ example: 'basic', description: 'Plan type identifier' })
  type: string;

  @ApiProperty({ example: 'Basic Plan Resolve', description: 'Display name for the plan' })
  name: string;

  @ApiProperty({ type: [PlanIntervalDto], description: 'Available billing intervals' })
  intervals: PlanIntervalDto[];
}

export class SubscriptionPlansResponseDto {
  @ApiProperty({ type: [SubscriptionPlanDto], description: 'Available subscription plans' })
  plans: SubscriptionPlanDto[];
}
