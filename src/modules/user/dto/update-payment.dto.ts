import { IsEnum, IsNotEmpty } from 'class-validator';
import { PaymentType, BillingInterval } from '../entities/user.entity';

export class UpdatePaymentDto {
  @IsEnum(PaymentType, { message: 'Invalid payment type' })
  @IsNotEmpty()
  payment_type: PaymentType;

  @IsEnum(BillingInterval, { message: 'Invalid billing interval' })
  @IsNotEmpty()
  billing_interval: BillingInterval;
}
