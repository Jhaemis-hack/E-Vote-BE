import { Injectable, Logger } from '@nestjs/common';
import { Inject, forwardRef } from '@nestjs/common';
import { EmailQueue } from './email.queue';
import { MailInterface } from './interface/email.interface';
import { ElectionService } from '../election/election.service';
import { Election } from '../election/entities/election.entity';
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  constructor(
    private emailQueue: EmailQueue,
    @Inject(forwardRef(() => ElectionService)) private electionService: ElectionService,
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
    const encodedEmail = encodeURIComponent(email);
    const link = `${url}?token=${token}&email=${encodedEmail}`;
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

  async sendElectionCreationEmail(email: string, election: Election): Promise<void> {
    const adminEmail = email;
    if (adminEmail) {
      const mail = {
        to: adminEmail,
        subject: `Election "${election.title}" is live!`,
        context: {
          adminName: adminEmail,
          electionTitle: election.title,
          electionStartDate: new Date(election.start_date).toISOString().split('T')[0],
          electionEndDate: new Date(election.end_date).toISOString().split('T')[0],
          electionStartTime: election.start_time,
          electionEndTime: election.end_time,
          dashboard: `${process.env.FRONTEND_URL}/elections`,
        },
        template: 'election-creation',
      };
      await this.emailQueue.sendEmail({ mail, template: 'election-creation' });
    }
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
    const votingLink = `${process.env.FRONTEND_URL}/votes/${votingLinkId}`;
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

  async sendResultsToAdminEmail(email: string, election: Election): Promise<void> {
    const mailPayload: MailInterface = {
      to: email,
      subject: `Election "${election.title}" Results Are Out!`,
      context: {
        email: email, // Add this line
        electionTitle: election.title,
        electionStartDate: new Date(election.start_date).toISOString().split('T')[0],
        electionEndDate: new Date(election.end_date).toISOString().split('T')[0],
        resultsLink: `${process.env.FRONTEND_URL}/elections/${election.id}`,
        dashboard: `${process.env.FRONTEND_URL}/elections`,
      },
      template: 'results-to-admin',
    };

    // Enqueue the email job
    await this.emailQueue.sendEmail({ mail: mailPayload, template: 'results-to-admin' });
  }
  async sendElectionEndEmails(election: any): Promise<void> {
    if (!election.voters || election.voters.length === 0) {
      this.logger.log(`No voters found for election ${election.id}, skipping email notifications.`);
      return;
    }

    this.logger.log(`Preparing to send emails to ${election.voters.length} voters.`);

    let results;
    try {
      results = await this.electionService.getElectionResults(election.id, election.created_by);
      console.log('Election results fetched:', results);
    } catch (error) {
      this.logger.error(`Error fetching election results: ${error.message}`);
      return;
    }

    if (!results?.data?.results || results.data.results.length === 0) {
      this.logger.error(`Election results are missing for election ${election.id}`);
      return;
    }

    const totalVotes = results.data.results.reduce((sum, res) => sum + (res.votes || 0), 0);

    let highestVotes = 0;
    let winner = 'No winner declared';

    results.data.results.forEach(res => {
      if (res.votes > highestVotes) {
        highestVotes = res.votes;
        winner = res.name;
      }
    });

    const formattedResults = results.data.results.map(res => ({
      name: res.name || 'Unknown Candidate',
      votes: res.votes !== undefined ? res.votes : 0,
      percentage: totalVotes > 0 ? ((res.votes / totalVotes) * 100).toFixed(2) : '0.00',
      isWinner: res.votes === highestVotes,
    }));

    const emailPromises = election.voters.map(voter => {
      this.logger.log(`Sending email to: ${voter.email}`);
      return this.emailQueue.sendEmail({
        mail: {
          to: voter.email,
          subject: `Results for Election: ${election.title}`,
          context: {
            voterName: voter.name || voter.email,
            electionTitle: election.title,
            electionStartDate: new Date(election.start_date).toISOString().split('T')[0],
            electionEndDate: new Date(election.end_date).toISOString().split('T')[0],
            electionWinner: winner,
            electionResults: formattedResults,
            electionLink: `${process.env.FRONTEND_URL}/results/${election.id}`,
          },
          template: 'election-results',
        },
        template: 'election-results',
      });
    });

    const emailResults = await Promise.allSettled(emailPromises);

    const failedEmails = emailResults
      .filter(result => result.status === 'rejected')
      .map((result, index) => `${election.voters[index].email}: ${result.reason}`);

    if (failedEmails.length > 0) {
      this.logger.error(`Failed to send emails to: ${failedEmails.join(', ')}`);
    }

    emailResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        this.logger.log(`Email sent successfully to ${election.voters[index].email}`);
      }
    });
  }

  async sendContactUsEmail(userEmail: string, fullName: string, subject: string, message: string): Promise<void> {
    const adminEmail = process.env.ADMIN_EMAIL;
    if (adminEmail) {
      const mail = {
        to: adminEmail,
        subject: 'New Contact Us Message',
        context: {
          subject: `New Contact Us Message: "${subject}"`,
          fullName,
          email: userEmail,
          message,
        },
        template: 'contact-us',
      };
      await this.emailQueue.sendEmail({ mail, template: 'contact-us' });
    }
  }
}
