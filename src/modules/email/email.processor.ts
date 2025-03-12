import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { MailerService } from '@nestjs-modules/mailer';
import { Logger } from '@nestjs/common';
import { MailInterface } from './interface/email.interface';

@Processor('emailQueue')
export class EmailProcessor {
  private logger = new Logger(EmailProcessor.name);

  constructor(private readonly mailerService: MailerService) {}

  @Process('verify-email')
  async sendVeriFyEmailJob(job: Job<MailInterface>) {
    const { mail } = job.data;
    try {
      await this.mailerService.sendMail({
        ...mail,
      });
      this.logger.log(`Verify Email successfully sent to ${mail.to}`);
    } catch (SendVerifyEmailError) {
      this.logger.error(`EmailProcessor - SendVerifyEmailError: ${SendVerifyEmailError.message}`);
    }
  }
}
