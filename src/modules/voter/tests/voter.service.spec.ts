import { Test, TestingModule } from '@nestjs/testing';
import { VoterService } from '../voter.service';

describe('VoterService', () => {
  let service: VoterService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [VoterService],
    }).compile();

    service = module.get<VoterService>(VoterService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
