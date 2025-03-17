import { Test, TestingModule } from '@nestjs/testing';
import { EmailService } from '../email.service';
import { EmailQueue } from '../email.queue';

describe('EmailService', () => {
  let emailService: EmailService;
  let emailQueueMock: jest.Mocked<EmailQueue>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        {
          provide: EmailQueue,
          useValue: {
            sendEmail: jest.fn().mockResolvedValue({ jobId: '12345' }), // Mocking sendEmail()
          },
        },
      ],
    }).compile();

    emailService = module.get<EmailService>(EmailService);
    emailQueueMock = module.get(EmailQueue);
  });

  it('should send verification email successfully', async () => {
    const email = 'test@example.com';
    const token = '12345';

    await emailService.sendVerificationMail(email, token);

    expect(emailQueueMock.sendEmail).toHaveBeenCalledWith({
      mail: {
        to: email,
        subject: 'Verify Your Email',
        context: { token: `${process.env.FRONTEND_URL}/verify?token=${token}` },
        template: 'verify-email',
      },
      template: 'verify-email',
    });
  });
});
