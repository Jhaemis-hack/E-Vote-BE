import { Test, TestingModule } from '@nestjs/testing';
import { EmailService } from '../email.service';
import { EmailQueue } from '../email.queue';
import { User } from '../../user/entities/user.entity';
import { Repository } from 'typeorm';
import { ElectionService } from '../../election/election.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Logger } from '@nestjs/common';

describe('EmailService', () => {
  let emailService: EmailService;
  let emailQueueMock: jest.Mocked<EmailQueue>;
  let electionServiceMock: jest.Mocked<ElectionService>;
  let userRepositoryMock: jest.Mocked<Repository<User>>;

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
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: ElectionService,
          useValue: {
            getElectionResults: jest.fn(),
            getElectionById: jest.fn(),
          },
        },
      ],
    }).compile();

    emailService = module.get<EmailService>(EmailService);
    emailQueueMock = module.get(EmailQueue);
    electionServiceMock = module.get(ElectionService);
    userRepositoryMock = module.get(getRepositoryToken(User));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('sendEmail', () => {
    it('should send an email successfully', async () => {
      const email = 'test@example.com';
      const subject = 'Test Subject';
      const template = 'welcome-email';
      const context = { name: 'Test User' };

      await emailService.sendEmail(email, subject, template, context);

      expect(emailQueueMock.sendEmail).toHaveBeenCalledWith({
        mail: {
          to: email,
          subject,
          context,
          template,
        },
        template: 'welcome-email',
      });
    });

    it('should handle email queue errors gracefully', async () => {
      const email = 'test@example.com';
      const subject = 'Test Subject';
      const template = 'welcome-email';
      const context = { name: 'Test User' };

      emailQueueMock.sendEmail.mockRejectedValueOnce(new Error('Queue error'));

      await expect(emailService.sendEmail(email, subject, template, context)).rejects.toThrow('Queue error');
    });
  });

  describe('sendWelcomeMail', () => {
    it('should send welcome email successfully', async () => {
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
  });

  describe('sendForgotPasswordMail', () => {
    it('should send forgot password email successfully', async () => {
      const email = 'test@example.com';
      const name = 'Test User';
      const url = 'http://example.com/reset';
      const token = 'reset-token';

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

    it('should handle missing name by using email as name', async () => {
      const email = 'test@example.com';
      const url = 'http://example.com/reset';
      const token = 'reset-token';

      await emailService.sendForgotPasswordMail(email, '', url, token);

      expect(emailQueueMock.sendEmail).toHaveBeenCalledWith({
        mail: {
          to: email,
          context: {
            name: '',
            link: `${url}?token=${token}`,
            email,
          },
        },
        template: 'reset-password',
      });
    });
  });

  describe('sendElectionStartEmails', () => {
    it('should send election start emails to all voters', async () => {
      const election = {
        title: 'Test Election',
        start_date: '2024-03-21',
        end_date: '2024-03-22',
        voters: [
          { email: 'voter1@example.com', name: 'Voter 1', verification_token: 'token1' },
          { email: 'voter2@example.com', name: 'Voter 2', verification_token: 'token2' },
        ],
      };

      await emailService.sendElectionStartEmails(election);

      expect(emailQueueMock.sendEmail).toHaveBeenCalledTimes(2);
      election.voters.forEach((voter, index) => {
        expect(emailQueueMock.sendEmail).toHaveBeenNthCalledWith(index + 1, {
          mail: {
            to: voter.email,
            subject: `Election ${election.title} has started!`,
            context: {
              voterName: voter.name,
              electionTitle: election.title,
              electionStartDate: election.start_date,
              electionEndDate: election.end_date,
              electionLink: `${process.env.FRONTEND_URL}/votes/${voter.verification_token}`,
            },
            template: 'election-start',
          },
          template: 'election-start',
        });
      });
    });

    it('should not send emails when there are no voters', async () => {
      const election = {
        title: 'Test Election',
        voters: [],
      };

      await emailService.sendElectionStartEmails(election);

      expect(emailQueueMock.sendEmail).not.toHaveBeenCalled();
    });

    it('should handle undefined voters array gracefully', async () => {
      const election = {
        title: 'Test Election',
        start_date: '2024-03-21',
        end_date: '2024-03-22',
      };

      await emailService.sendElectionStartEmails(election);

      expect(emailQueueMock.sendEmail).not.toHaveBeenCalled();
    });

    it('should handle voters without verification tokens', async () => {
      const election = {
        title: 'Test Election',
        start_date: '2024-03-21',
        end_date: '2024-03-22',
        voters: [{ email: 'voter@example.com', name: 'Voter' }],
      };

      await emailService.sendElectionStartEmails(election);

      expect(emailQueueMock.sendEmail).toHaveBeenCalledWith({
        mail: {
          to: 'voter@example.com',
          subject: `Election ${election.title} has started!`,
          context: {
            voterName: 'Voter',
            electionTitle: election.title,
            electionStartDate: election.start_date,
            electionEndDate: election.end_date,
            electionLink: `${process.env.FRONTEND_URL}/votes/undefined`,
          },
          template: 'election-start',
        },
        template: 'election-start',
      });
    });
  });

  describe('sendElectionEndEmails', () => {
    const mockElection = {
      id: '1',
      title: 'Test Election',
      start_date: '2024-03-21',
      end_date: '2024-03-22',
      created_by: 'admin',
      voters: [
        { email: 'voter1@example.com', name: 'Voter 1' },
        { email: 'voter2@example.com', name: 'Voter 2' },
      ],
    };

    const mockResults = {
      status_code: 200,
      message: 'Success',
      severity: 'success',
      data: {
        election_id: '1',
        title: 'Test Election',
        total_votes: 8,
        results: [
          { candidate_id: 'c1', name: 'Candidate 1', votes: 5 },
          { candidate_id: 'c2', name: 'Candidate 2', votes: 3 },
        ],
      },
    };

    beforeEach(() => {
      electionServiceMock.getElectionResults.mockResolvedValue(mockResults);
    });

    it('should send election end emails with results to all voters', async () => {
      await emailService.sendElectionEndEmails(mockElection);

      expect(emailQueueMock.sendEmail).toHaveBeenCalledTimes(2);
      mockElection.voters.forEach((voter, index) => {
        expect(emailQueueMock.sendEmail).toHaveBeenNthCalledWith(index + 1, {
          mail: {
            to: voter.email,
            subject: `Results for Election: ${mockElection.title}`,
            context: {
              voterName: voter.name,
              electionTitle: mockElection.title,
              electionStartDate: mockElection.start_date,
              electionEndDate: mockElection.end_date,
              electionWinner: 'Candidate 1',
              electionResults: [
                { name: 'Candidate 1', votes: 5, percentage: '62.50', isWinner: true },
                { name: 'Candidate 2', votes: 3, percentage: '37.50', isWinner: false },
              ],
              electionLink: `${process.env.FRONTEND_URL}/results/${mockElection.id}`,
            },
            template: 'election-results',
          },
          template: 'election-results',
        });
      });
    });

    it('should handle election with no voters', async () => {
      const electionWithNoVoters = { ...mockElection, voters: [] };
      await emailService.sendElectionEndEmails(electionWithNoVoters);
      expect(emailQueueMock.sendEmail).not.toHaveBeenCalled();
    });

    it('should handle error when fetching election results', async () => {
      electionServiceMock.getElectionResults.mockRejectedValue(new Error('Failed to fetch results'));
      await emailService.sendElectionEndEmails(mockElection);
      expect(emailQueueMock.sendEmail).not.toHaveBeenCalled();
    });

    it('should handle tie results correctly', async () => {
      const tieResults = {
        status_code: 200,
        message: 'Success',
        severity: 'success',
        data: {
          election_id: '1',
          title: 'Test Election',
          total_votes: 10,
          results: [
            { candidate_id: 'c1', name: 'Candidate 1', votes: 5 },
            { candidate_id: 'c2', name: 'Candidate 2', votes: 5 },
          ],
        },
      };

      electionServiceMock.getElectionResults.mockResolvedValueOnce(tieResults);

      await emailService.sendElectionEndEmails(mockElection);

      mockElection.voters.forEach((voter, index) => {
        expect(emailQueueMock.sendEmail).toHaveBeenNthCalledWith(index + 1, {
          mail: {
            to: voter.email,
            subject: `Results for Election: ${mockElection.title}`,
            context: expect.objectContaining({
              electionResults: [
                { name: 'Candidate 1', votes: 5, percentage: '50.00', isWinner: true },
                { name: 'Candidate 2', votes: 5, percentage: '50.00', isWinner: true },
              ],
            }),
            template: 'election-results',
          },
          template: 'election-results',
        });
      });
    });

    it('should handle missing candidate names in results', async () => {
      const resultsWithMissingNames = {
        status_code: 200,
        message: 'Success',
        severity: 'success',
        data: {
          election_id: '1',
          title: 'Test Election',
          total_votes: 8,
          results: [
            { candidate_id: 'c1', name: 'Unknown', votes: 5 },
            { candidate_id: 'c2', name: '', votes: 3 },
          ],
        },
      };

      electionServiceMock.getElectionResults.mockResolvedValueOnce(resultsWithMissingNames);

      await emailService.sendElectionEndEmails(mockElection);

      expect(emailQueueMock.sendEmail).toHaveBeenCalledTimes(2);
      mockElection.voters.forEach((voter, index) => {
        expect(emailQueueMock.sendEmail).toHaveBeenNthCalledWith(index + 1, {
          mail: {
            to: voter.email,
            subject: `Results for Election: ${mockElection.title}`,
            context: {
              voterName: voter.name,
              electionTitle: mockElection.title,
              electionStartDate: mockElection.start_date,
              electionEndDate: mockElection.end_date,
              electionWinner: 'Unknown',
              electionResults: [
                { name: 'Unknown', votes: 5, percentage: '62.50', isWinner: true },
                { name: 'Unknown Candidate', votes: 3, percentage: '37.50', isWinner: false },
              ],
              electionLink: `${process.env.FRONTEND_URL}/results/${mockElection.id}`,
            },
            template: 'election-results',
          },
          template: 'election-results',
        });
      });
    });
  });

  describe('sendVotingLinkMail', () => {
    it('should send voting link email successfully', async () => {
      const email = 'voter@example.com';
      const name = 'Test Voter';
      const title = 'Test Election';
      const start_date = '2024-03-21';
      const start_time = '10:00';
      const end_date = '2024-03-22';
      const end_time = '18:00';
      const votingLinkId = 'voting-link-123';

      await emailService.sendVotingLinkMail(
        email,
        name,
        title,
        start_date,
        start_time,
        end_date,
        end_time,
        votingLinkId,
      );

      expect(emailQueueMock.sendEmail).toHaveBeenCalledWith({
        mail: {
          to: email,
          subject: `You have been invited to vote in the ${title}`,
          template: 'voter-invite',
          context: {
            name,
            title,
            start_date,
            start_time,
            end_date,
            end_time,
            votingLink: `${process.env.FRONTEND_URL}/vote/${votingLinkId}`,
          },
        },
        template: 'voter-invite',
      });
    });

    it('should handle missing voter name by using email as name', async () => {
      const email = 'voter@example.com';
      const title = 'Test Election';
      const start_date = '2024-03-21';
      const start_time = '10:00';
      const end_date = '2024-03-22';
      const end_time = '18:00';
      const votingLinkId = 'voting-link-123';

      await emailService.sendVotingLinkMail(email, '', title, start_date, start_time, end_date, end_time, votingLinkId);

      expect(emailQueueMock.sendEmail).toHaveBeenCalledWith({
        mail: {
          to: email,
          subject: `You have been invited to vote in the ${title}`,
          template: 'voter-invite',
          context: {
            name: email,
            title,
            start_date,
            start_time,
            end_date,
            end_time,
            votingLink: `${process.env.FRONTEND_URL}/vote/${votingLinkId}`,
          },
        },
        template: 'voter-invite',
      });
    });

    it('should handle queue errors when sending voting link', async () => {
      const email = 'voter@example.com';
      const name = 'Test Voter';
      const title = 'Test Election';
      const start_date = '2024-03-21';
      const start_time = '10:00';
      const end_date = '2024-03-22';
      const end_time = '18:00';
      const votingLinkId = 'voting-link-123';

      emailQueueMock.sendEmail.mockRejectedValueOnce(new Error('Failed to send voting link'));

      await expect(
        emailService.sendVotingLinkMail(email, name, title, start_date, start_time, end_date, end_time, votingLinkId),
      ).rejects.toThrow('Failed to send voting link');
    });
  });
});
