import { Test, TestingModule } from '@nestjs/testing';
import { ElectionPaymentService } from '../payment.service';

describe('ElectionPaymentService', () => {
  let service: ElectionPaymentService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ElectionPaymentService],
    }).compile();

    service = module.get<ElectionPaymentService>(ElectionPaymentService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

});