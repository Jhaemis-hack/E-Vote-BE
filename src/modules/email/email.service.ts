import { Injectable } from '@nestjs/common';
import { EmailQueue } from './email.queue';
import { MailInterface } from './interface/email.interface';
import { randomUUID } from 'crypto';
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

  async sendVotingLink(
    email: string,
    start_date: Date,
    start_time: string,
    end_date: Date,
    end_time: string,
    votingLinkId: string,
  ): Promise<void> {
    const votingLink = `${process.env.FRONTEND_URL}/vote/${votingLinkId}`;
    await this.sendEmail(email, 'Here is your voting link', 'voting-link', {
      email,
      votingLink,
      start_date,
      start_time,
      end_date,
      end_time,
    });
  }
}
