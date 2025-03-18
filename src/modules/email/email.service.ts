import { Injectable } from '@nestjs/common';
import { EmailQueue } from './email.queue';
import { MailInterface } from './interface/email.interface';
import { Election } from '../election/entities/election.entity';
import { User } from '../user/entities/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
@Injectable()

export class EmailService {
  constructor(
    private emailQueue: EmailQueue,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}
  async sendEmail(email: string, subject: string, template: string, context: Record<string, any>): Promise<void> {
    await this.emailQueue.sendEmail({
      mail: {
        to: email,
        subject,
        context,
        template,
      },
     // template: 'verify-email',
      template: 'welcome-email',
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

    // Add the job to the email queue
    await this.emailQueue.sendEmail({ mail, template: 'election-monitor' });
    }
  }
}
