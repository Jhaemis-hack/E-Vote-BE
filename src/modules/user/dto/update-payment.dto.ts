import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';
import { UserPlan, BillingInterval } from '../entities/user.entity';

export class UpdatePaymentDto {
  @ApiProperty({ enum: UserPlan, description: 'Type of payment plan' })
  @IsEnum(UserPlan, { message: 'Invalid payment type' })
  @IsNotEmpty()
  plan: UserPlan;

  @ApiProperty({ enum: BillingInterval, description: 'Billing interval for the subscription' })
  @IsEnum(BillingInterval, { message: 'Invalid billing interval' })
  @IsNotEmpty()
  billing_interval: BillingInterval;
}
