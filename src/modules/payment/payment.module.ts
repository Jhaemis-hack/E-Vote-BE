import { Module } from '@nestjs/common';
import { ElectionPaymentService } from './payment.service';
import { PaymentController } from './payment.controller';

@Module({
  controllers: [PaymentController],
  providers: [ElectionPaymentService],
  exports: [ElectionPaymentService],
})
export class PaymentModule {}