import { Test, TestingModule } from '@nestjs/testing';
import { config } from 'dotenv';
import { EmailQueue } from '../email.queue';
import { EmailService } from '../email.service';

config();

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
            sendEmail: jest.fn().mockResolvedValue({ jobId: '12345' }),
          },
        },
      ],
    }).compile();
    emailService = module.get<EmailService>(EmailService);
    emailQueueMock = module.get(EmailQueue);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('Should send email successfully', async () => {
    const email = 'test@examplecom';
    const subject = 'Test subject';
    const template = 'test-template';
    const context = { key: 'value' };

    await emailService.sendEmail(email, subject, template, context);

    expect(emailQueueMock.sendEmail).toHaveBeenLastCalledWith({
      mail: {
        to: email,
        subject,
        context,
        template,
      },
      template: 'welcome-email',
    });
  });

  it('should send forgot password email successfully', async () => {
    const email = 'test@examplecom';
    const name = 'Simon James';
    const url = 'http://resolve.vote/reset-password';
    const token = '12345';

    await emailService.sendForgotPasswordMail(email, name, url, token);

    expect(emailQueueMock.sendEmail).toHaveBeenCalledWith({
      mail: {
        to: email,
        context: {
          name,
          link: `${url}?token=${token}`,
          email,
        },
      },
      template: 'reset-password',
    });
  });

  it('should send welcom email successfully', async () => {
    const email = 'test@example.com';

    await emailService.sendWelcomeMail(email);
    expect(emailQueueMock.sendEmail).toHaveBeenCalledWith({
      mail: {
        to: email,
        subject: 'Welcome to Resolve.vote',
        context: { email },
        template: 'welcome-email',
      },
      template: 'welcome-email',
    });
  });

  it('Should send election start emails to all voters', async () => {
    const election = {
      title: 'Test election',
      start_date: '2025-03-23',
      end_date: '2025-03-28',
      voters: [
        { email: 'voter1@example.com', name: 'Tope', verification_token: 'verification_token_1' },
        { email: 'voter2@example.com', name: 'sinzu', verification_token: 'verification_token_2' },
      ],
    };

    await emailService.sendElectionStartEmails(election);

    // Verify the first call
    expect(emailQueueMock.sendEmail).toHaveBeenCalledWith({
      mail: {
        to: 'voter1@example.com',
        subject: `Election ${election.title} has started!`,
        context: {
          voterName: 'Tope',
          electionTitle: election.title,
          electionStartDate: '2025-03-23',
          electionEndDate: '2025-03-28',
          electionLink: `${process.env.FRONTEND_URL}/votes/verification_token_1`,
        },
        template: 'election-start',
      },
      template: 'election-start',
    });

    // Verify the second call
    expect(emailQueueMock.sendEmail).toHaveBeenCalledWith({
      mail: {
        to: 'voter2@example.com',
        subject: `Election ${election.title} has started!`,
        context: {
          voterName: 'sinzu',
          electionTitle: election.title,
          electionStartDate: '2025-03-23',
          electionEndDate: '2025-03-28',
          electionLink: `${process.env.FRONTEND_URL}/votes/verification_token_2`,
        },
        template: 'election-start',
      },
      template: 'election-start',
    });

    expect(emailQueueMock.sendEmail).toHaveBeenCalledTimes(2);
  });

  it('should send election reminder emails to non-voted voters', async () => {
    const election = {
      title: 'Test Election',
      end_date: '2023-10-10',
      end_time: '23:59',
      voters: [
        { email: 'voter1@example.com', name: 'Voter 1', verification_token: 'token1' },
        { email: 'voter2@example.com', name: 'Voter 2', verification_token: 'token2' },
      ],
    };
    const nonVotedVoters = [{ email: 'voter1@example.com', name: 'Voter 1', verification_token: 'token1' }];

    await emailService.sendElectionReminderEmails(election, nonVotedVoters);

    expect(emailQueueMock.sendEmail).toHaveBeenCalledTimes(1);
    expect(emailQueueMock.sendEmail).toHaveBeenCalledWith({
      mail: {
        to: 'voter1@example.com',
        subject: `Reminder: Election "${election.title}" ends soon!`,
        context: {
          voterName: 'Voter 1',
          electionTitle: election.title,
          electionEndDate: '2023-10-10',
          electionEndTime: election.end_time,
          electionLink: `${process.env.FRONTEND_URL}/votes/token1`,
          hoursRemaining: expect.any(Number),
        },
        template: 'election-reminder',
      },
      template: 'election-reminder',
    });
  });
});

// TODO

// it('should send verification email successfully', async () => {
//   const email = 'test@example.com';
//   const token = '12345';

//   await emailService.sendVerificationMail(email, token);

//   expect(emailQueueMock.sendEmail).toHaveBeenCalledWith({
//     mail: {
//       to: email,
//       subject: 'Verify Your Email',
//       context: { token: `${process.env.FRONTEND_URL}/verify?token=${token}` },
//       template: 'verify-email',
//     },
//     template: 'verify-email',
//   });
