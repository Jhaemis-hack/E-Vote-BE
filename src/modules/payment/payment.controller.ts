import { Controller, Post, Body, Get, Param, Query } from '@nestjs/common';
import { ElectionPaymentService } from './payment.service';

@Controller('payments')
export class PaymentController {
  constructor(private readonly paymentService: ElectionPaymentService) {}

  @Post('election/register')
  async createElectionPayment(@Body() body: {
    electionId: string;
    registrationType: 'voter' | 'candidate';
    amount: number;
    currency: string;
    userData: { userId: string; email?: string; name?: string };
  }) {
    return this.paymentService.createRegistrationPayment(
      body.electionId,
      body.registrationType,
      body.amount,
      body.currency,
      body.userData
    );
  }

  @Get('election/:paymentLinkId/verify')
  async verifyElectionPayment(
    @Param('paymentLinkId') paymentLinkId: string,
    @Query('electionId') electionId: string,
  ) {
    return this.paymentService.verifyPayment(paymentLinkId, electionId);
  }

  @Get('election/:electionId/report')
  async getElectionPaymentReport(@Param('electionId') electionId: string) {
    return this.paymentService.getPaymentReport(electionId);
  }

  @Get('election/user/:userId')
  async checkUserPayment(
    @Param('userId') userId: string,
    @Query('electionId') electionId: string,
    @Query('type') type?: 'voter' | 'candidate',
  ) {
    return this.paymentService.hasUserPaid(electionId, userId, type);
  }

  @Get('election/stats')
  async getElectionStats(@Query('electionIds') electionIds?: string) {
    const parsedIds = electionIds ? electionIds.split(',') : undefined;
    return this.paymentService.getElectionRevenueStats(parsedIds);
  }
}