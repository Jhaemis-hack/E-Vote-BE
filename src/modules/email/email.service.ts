import { Injectable } from '@nestjs/common';
import { EmailQueue } from './email.queue';
import { MailInterface } from './interface/email.interface';
@Injectable()
export class EmailService {
  constructor(private emailQueue: EmailQueue) {}
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
