import { IsEnum, IsOptional, IsString } from "class-validator"
import { ApiProperty } from "@nestjs/swagger"

export enum PlanType {
  BASIC = "basic",
  BUSINESS = "business",
}

export enum BillingInterval {
  MONTHLY = "monthly",
  YEARLY = "yearly",
}

export class CheckoutQueryDto {
  @ApiProperty({
    enum: PlanType,
    default: PlanType.BASIC,
    description: "Subscription plan type",
  })
  @IsEnum(PlanType)
  @IsOptional()
  plan?: PlanType = PlanType.BASIC

  @ApiProperty({
    enum: BillingInterval,
    default: BillingInterval.MONTHLY,
    description: "Billing interval",
  })
  @IsEnum(BillingInterval)
  @IsOptional()
  interval?: BillingInterval = BillingInterval.MONTHLY

  @ApiProperty({
    required: false,
    description: "User ID for tracking subscription",
  })
  @IsString()
  @IsOptional()
  userId?: string
}

