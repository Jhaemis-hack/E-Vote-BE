import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { MailerService } from '@nestjs-modules/mailer';
import { Logger } from '@nestjs/common';
import { MailInterface } from './interface/email.interface';

@Processor('emailQueue')
export class EmailProcessor {
  private logger = new Logger(EmailProcessor.name);

  constructor(private readonly mailerService: MailerService) {}

  //  TODO
  // @Process('verify-email')
  // async sendVeriFyEmailJob(job: Job<MailInterface>) {
  //   const { mail } = job.data;
  //   try {
  //     await this.mailerService.sendMail({
  //       ...mail,
  //     });
  //     this.logger.log(`Verify Email successfully sent to ${mail.to}`);
  //   } catch (SendVerifyEmailError) {
  //     this.logger.error(`EmailProcessor - SendVerifyEmailError: ${SendVerifyEmailError.message}`);
  //   }
  // }

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

  @Process('election-start')
  async sendElectionStartEmailJob(job: Job<MailInterface>) {
    const { mail } = job.data;
    try {
      await this.mailerService.sendMail({
        ...mail,
      });
      this.logger.log(`Election start email sent successfully to ${mail.to}`);
    } catch (error) {
      this.logger.error(`EmailProcessor - ElectionStartEmailJob error: ${error.message}`);
    }
  }

  @Process('voter-invite')
  async sendVotingLinkJob(job: Job<MailInterface>) {
    try {
      const { mail } = job.data;
      await this.mailerService.sendMail({
        ...mail,
        subject: `You have been invited to vote in the ${mail.context.title}`,
        template: 'voter-invite',
      });
      this.logger.log(`Voting link has been sent sucessfully to ${mail.to}`);
    } catch (sendVotingLinkJobError) {
      this.logger.error(`EmailProcessor - sendVotingLinkJobError: ${sendVotingLinkJobError.message}`);
    }
  }
}
