import { Injectable } from '@nestjs/common';
import { EmailQueue } from './email.queue';
import { MailInterface } from './interface/email.interface';
@Injectable()
export class EmailService {
  constructor(private emailQueue: EmailQueue) {}
  async sendEmail(
    email: string,
    subject: string,
    template: 'verify-email' | 'reset-password' | 'welcome-email' | 'voting-link',
    context: Record<string, any>,
  ): Promise<void> {
    await this.emailQueue.sendEmail({
      mail: {
        to: email,
        subject,
        template,
        context,
      },
      template,
      // template: 'verify-email',
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

  async sendVotingLink(
    email: string,
    start_date: Date,
    start_time: string,
    end_date: Date,
    end_time: string,
    votingLinkId: string,
  ) {
    const votingLink = `${process.env.FRONTEND_URL}/vote/${votingLinkId}`;
    return this.emailQueue.sendEmail({
      mail: {
        to: email,
        subject: 'Here is your voting link',
        template: 'voting-link',
        context: { email, votingLink, start_date, start_time, end_date, end_time },
      },
      template: 'voting-link',
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
                electionLink: `${process.env.FRONTEND_URL}/votes/${voter.verification_token}`,
              },
              template: 'election-start',
            },
            template: 'election-start',
          }),
        ),
      );
    }
  }
}
