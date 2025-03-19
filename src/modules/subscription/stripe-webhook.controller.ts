import { Controller, Post, Headers, HttpException, HttpStatus, Req } from "@nestjs/common"
import type { SubscriptionService } from "./subscription.service"
import type { Request } from "express"
import { ApiTags, ApiOperation, ApiHeader, ApiResponse } from "@nestjs/swagger"
import { WebhookResponseDto } from "./dto/webhook-response.dto"

@ApiTags("Subscription")
@Controller("subscription/webhook")
export class StripeWebhookController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Post()
  @ApiOperation({ summary: "Handle Stripe webhook events" })
  @ApiHeader({
    name: "stripe-signature",
    description: "Stripe signature for webhook verification",
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: "Webhook processed successfully",
    type: WebhookResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: "Invalid webhook payload or signature",
  })
  async handleWebhook(
    @Headers('stripe-signature') signature: string,
    @Req() request: Request,
  ): Promise<WebhookResponseDto> {
    try {
      if (!signature) {
        throw new HttpException("Missing stripe-signature header", HttpStatus.BAD_REQUEST)
      }

      if (!request.body) {
        throw new HttpException("Missing request body", HttpStatus.BAD_REQUEST)
      }

      const event = this.subscriptionService.verifyWebhookSignature(request.body, signature)

      switch (event.type) {
        case "customer.subscription.created":
        case "customer.subscription.updated":
        case "customer.subscription.deleted":
          await this.subscriptionService.processSubscriptionUpdate(event.data.object)
          break
        case "invoice.paid":
          await this.subscriptionService.processInvoicePaid(event.data.object)
          break
        case "invoice.payment_failed":
          await this.subscriptionService.processInvoicePaymentFailed(event.data.object)
          break
        default:
          console.log(`Unhandled event type ${event.type}`)
      }

      return { received: true }
    } catch (error) {
      console.error("Webhook error:", error)
      throw new HttpException(error.message || "Webhook handler failed", HttpStatus.BAD_REQUEST)
    }
  }
}

