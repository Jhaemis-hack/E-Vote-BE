import { Inject, Injectable, Logger } from '@nestjs/common';
import { EmailQueue } from './email.queue';
import { EmailSender, MailInterface } from './interface/email.interface';
import { Election } from '../election/entities/election.entity';
import { User } from '../user/entities/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @Inject(EmailQueue)
    private readonly emailQueue: EmailQueue,
  ) {}

  async sendEmail(
    email: string,
    subject: string,
    template: EmailSender['template'],
    context: Record<string, any>,
  ): Promise<void> {
    await this.emailQueue.sendEmail({
      mail: {
        to: email,
        subject,
        context,
        template,
      },
      template: template,
    });
  }

  // TODO
  // async sendVerificationMail(email: string, token: string): Promise<void> {
  //   const verificationLink = `${process.env.FRONTEND_URL}/verify?token=${token}`;
  //   await this.sendEmail(email, 'Verify Your Email', 'verify-email', { token: verificationLink });
  // }

  async sendForgotPasswordMail(email: string, name: string, url: string, token: string) {
    const link = `${url}?token=${token}`;
    const mailPayload: MailInterface = {
      to: email,
      context: {
        name,
        link,
        email,
      },
    };

    await this.emailQueue.sendEmail({ mail: mailPayload, template: 'reset-password' });
  }

  async sendWelcomeMail(email: string) {
    await this.sendEmail(email, 'Welcome to Resolve.vote', 'welcome-email', { email });
  }

  async sendVotingLinkMail(
    email: string,
    name: string,
    title: string,
    start_date: string,
    start_time: string,
    end_date: string,
    end_time: string,
    votingLinkId: string,
  ) {
    const votingLink = `${process.env.FRONTEND_URL}/vote/${votingLinkId}`;
    return this.emailQueue.sendEmail({
      mail: {
        to: email,
        subject: `You have been invited to vote in the ${title}`,
        template: 'voter-invite',
        context: { name: name || email, title, start_date, start_time, end_date, end_time, votingLink },
      },
      template: 'voter-invite',
    });
  }

  async sendElectionStartEmails(election: any): Promise<void> {
    if (election.voters && election.voters.length > 0) {
      await Promise.all(
        election.voters.map(voter =>
          this.emailQueue.sendEmail({
            mail: {
              to: voter.email,
              subject: `Election ${election.title} has started!`,
              context: {
                voterName: voter.name || voter.email,
                electionTitle: election.title,
                electionStartDate: new Date(election.start_date).toISOString().split('T')[0],
                electionEndDate: new Date(election.end_date).toISOString().split('T')[0],
                electionLink: `${process.env.FRONTEND_URL}/vote/${voter.verification_token}`,
              },
            },
            template: 'election-start',
          }),
        ),
      );
    }
  }

  async sendAdminElectionMonitorEmails(election: Election): Promise<void> {
    const adminUser = election.created_by_user;

    if (adminUser && adminUser.email) {
      const mail = {
        to: adminUser.email,
        subject: `Election "${election.title}" has started!`,
        context: {
          adminEmail: adminUser.email,
          electionTitle: election.title,
          electionStartDate: new Date(election.start_date).toISOString().split('T')[0],
          electionEndDate: new Date(election.end_date).toISOString().split('T')[0],
        },
        template: 'election-monitor',
      };

      await this.emailQueue.sendEmail({ mail, template: 'election-monitor' });
    }
  }

  async sendElectionReminderEmails(election: any, nonVotedVoters: any[]): Promise<void> {
    if (nonVotedVoters && nonVotedVoters.length > 0) {
      await Promise.all(
        nonVotedVoters.map(voter =>
          this.emailQueue.sendEmail({
            mail: {
              to: voter.email,
              subject: `Reminder: Election "${election.title}" ends soon!`,
              context: {
                voterName: voter.name || voter.email,
                electionTitle: election.title,
                electionEndDate: new Date(election.end_date).toISOString().split('T')[0],
                electionEndTime: election.end_time,
                electionLink: `${process.env.FRONTEND_URL}/votes/${voter.verification_token}`,
                hoursRemaining: Math.ceil(
                  (new Date(election.end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60),
                ),
              },
              template: 'election-reminder',
            },
            template: 'election-reminder',
          }),
        ),
      );
    }
  }
}
