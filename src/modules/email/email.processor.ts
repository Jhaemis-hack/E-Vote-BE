import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { MailerService } from '@nestjs-modules/mailer';
import { HttpStatus, Logger } from '@nestjs/common';
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

  @Process('reset-password')
  async sendResetPasswordEmailJob(job: Job<MailInterface>) {
    try {
      const { mail } = job.data;
      await this.mailerService.sendMail({
        ...mail,
        subject: 'Reset Password',
        template: 'reset-password',
      });
      this.logger.log(`Reset password email sent successfully to ${mail.to}`);
    } catch (sendResetPasswordEmailJobError) {
      this.logger.error(`EmailProcessor - sendResetPasswordEmailJobError: ${sendResetPasswordEmailJobError}`);
    }
  }

  @Process('welcome-email')
  async sendWelcomeEmailJob(job: Job<MailInterface>) {
    try {
      const { mail } = job.data;
      await this.mailerService.sendMail({
        ...mail,
        subject: 'Welcome to our platform',
        template: 'welcome-email',
      });
      this.logger.log(`Welcome email sent successfully to ${mail.to}`);
    } catch (sendWelcomeEmailJobError) {
      this.logger.error(`EmailProcessor - sendWelcomeEmailJobError: ${sendWelcomeEmailJobError}`);
    }
  }

  @Process('voting-link')
  async sendVotingLinkJob(job: Job<MailInterface>) {
    try {
      const { mail } = job.data;
      await this.mailerService.sendMail({
        ...mail,
        subject: 'Here is your voting link. Vote your choice!',
        template: 'voting-link',
      });
      this.logger.log(`Voting link has been sent sucessfully to ${mail.to}`);
    } catch (sendVotingLinkJobError) {
      // return {
      //   status_code: HttpStatus.INTERNAL_SERVER_ERROR,
      //   message: `EmailProcessor - sendVotingLinkJobError: ${sendVotingLinkJobError.message}`,
      //   data: null,
      // };
      this.logger.error(`EmailProcessor - sendVotingLinkJobError: ${sendVotingLinkJobError.message}`);
    }
  }
}
