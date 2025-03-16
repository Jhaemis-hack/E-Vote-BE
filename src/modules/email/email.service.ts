import { Injectable } from '@nestjs/common';
import { EmailQueue } from './email.queue';
import { MailInterface } from './interface/email.interface';
import { Voter } from '../voter/entities/voter.entity';
@Injectable()
export class EmailService {
  constructor(private emailQueue: EmailQueue) {}
  async sendEmail(email: string, subject: string, template: string, context: Record<string, any>): Promise<void> {
    await this.emailQueue.sendEmail({
      mail: {
        to: email,
        subject,
        context,
        template,
      },
      template: 'verify-email',
    });
  }

  async sendVerificationMail(email: string, token: string): Promise<void> {
    const verificationLink = `${process.env.FRONTEND_URL}/verify?token=${token}`;
    await this.sendEmail(email, 'Verify Your Email', 'verify-email', { token: verificationLink });
  }

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

  async sendElectionStartEmails(election: any): Promise<void> {
    if (election.voters && election.voters.length > 0) {
      for (const voter of election.voters) {
        await this.emailQueue.sendEmail({
          mail: {
            to: voter.email,
            subject: `Election ${election.title} has started!`,
            context: {
              electionTitle: election.title,
              electionEndDate: election.end_date,
              electionLink: `${process.env.FRONTEND_URL}/vote/${election.vote_id}`,
            },
            template: 'election-start',
          },
          template: 'election-start',
        });
      }
    }
  }
  async sendElectionReminderEmails(election: any, reminderTime: Date): Promise<void> {
    if (election.email_notification === true && election.voters && election.voters.length > 0) {
      const unvotedVoters = election.voters.filter(voter => !voter.votes?.length);

      for (const voter of unvotedVoters) {
        await this.emailQueue.sendEmail({
          mail: {
            to: voter.email,
            subject: `Reminder: Don't forget to vote in ${election.title}!`,
            context: {
              electionTitle: election.title,
              electionEndDate: election.end_date,
              electionLink: `${process.env.FRONTEND_URL}/vote/${election.vote_id}`,
              reminderTime: reminderTime.toLocaleString(),
            },
            template: 'election-reminder',
          },
          template: 'election-reminder',
        });
      }
    }
  }
}
