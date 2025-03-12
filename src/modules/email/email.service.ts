import { Injectable } from '@nestjs/common';
import { EmailQueue } from './email.queue';
import { MailInterface } from './interface/email.interface';
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
}
