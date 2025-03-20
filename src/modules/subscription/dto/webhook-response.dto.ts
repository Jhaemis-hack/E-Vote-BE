import { ApiProperty } from "@nestjs/swagger"

export class WebhookResponseDto {
  @ApiProperty({ example: true, description: "Indicates if the webhook was received successfully" })
  received: boolean
}

