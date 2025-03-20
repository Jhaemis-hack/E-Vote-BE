import { Test, TestingModule } from '@nestjs/testing';
import { SubscriptionService } from '../subscription.service';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { Subscription } from '../entities/subscription.entity';

describe('SubscriptionService', () => {
  let service: SubscriptionService;
  let userRepository: Repository<User>;
  let subscriptionRepository: Repository<Subscription>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key: string) => {
              switch (key) {
                case 'STRIPE_SECRET_KEY':
                  return 'test_stripe_secret_key';
                case 'BASIC_MONTHLY_LINK':
                  return 'https://buy.stripe.com/test_basic_monthly';
                case 'BASIC_YEARLY_LINK':
                  return 'https://buy.stripe.com/test_basic_yearly';
                case 'BUSINESS_MONTHLY_LINK':
                  return 'https://buy.stripe.com/test_business_monthly';
                case 'BUSINESS_YEARLY_LINK':
                  return 'https://buy.stripe.com/test_business_yearly';
                default:
                  return null;
              }
            }),
          },
        },
        {
          provide: getRepositoryToken(User),
          useClass: Repository,
        },
        {
          provide: getRepositoryToken(Subscription),
          useClass: Repository,
        },
      ],
    }).compile();

    service = module.get<SubscriptionService>(SubscriptionService);
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    subscriptionRepository = module.get<Repository<Subscription>>(getRepositoryToken(Subscription));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});