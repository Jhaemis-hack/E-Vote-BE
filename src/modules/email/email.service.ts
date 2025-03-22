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
                electionEndTime: election.end_time,
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

  /**
   * Send reminder emails at specific intervals before an election ends
   * @param election The election information
   * @param nonVotedVoters Array of voters who haven't voted yet
   * @param reminderInterval The interval before election end (30min, 1hour, or 1hour30min)
   * @returns Object with success status and message
   */
  async sendIntervalReminderEmails(
    election: any,
    nonVotedVoters: any[],
    reminderInterval: '30min' | '1hour' | '1hour30min',
  ): Promise<{ success: boolean; message: string; sent?: number }> {
    this.logger.log(`Attempting to send ${reminderInterval} reminders for election ${election.id}`);

    // Check if there are non-voted voters
    if (!nonVotedVoters || nonVotedVoters.length === 0) {
      this.logger.log(`No voters left to remind for election ${election.id}`);
      return { success: false, message: 'No voters left to remind' };
    }

    // Calculate remaining time in milliseconds
    const electionEndTime = new Date(`${election.end_date}T${election.end_time || '23:59:59'}`).getTime();
    const currentTime = new Date().getTime();
    const remainingTimeMs = electionEndTime - currentTime;

    // Convert interval to milliseconds for comparison
    let intervalMs: number;
    let intervalText: string;

    switch (reminderInterval) {
      case '30min':
        intervalMs = 30 * 60 * 1000; // 30 minutes in ms
        intervalText = '30 minutes';
        break;
      case '1hour':
        intervalMs = 60 * 60 * 1000; // 1 hour in ms
        intervalText = '1 hour';
        break;
      case '1hour30min':
        intervalMs = 90 * 60 * 1000; // 1 hour 30 minutes in ms
        intervalText = '1 hour and 30 minutes';
        break;
      default:
        return {
          success: false,
          message: 'Invalid reminder interval',
        };
    }

    // Check if reminder makes sense based on remaining time
    if (remainingTimeMs < intervalMs) {
      this.logger.warn(
        `Cannot send ${intervalText} reminder for election ${election.id} as it ends in less than ${intervalText}`,
      );
      return {
        success: false,
        message: `Cannot send ${intervalText} reminder as the election ends in less than ${intervalText}`,
      };
    }

    try {
      // Send reminders to all non-voted voters
      await Promise.all(
        nonVotedVoters.map(voter =>
          this.emailQueue.sendEmail({
            mail: {
              to: voter.email,
              subject: `Reminder: Election "${election.title}" ends in ${intervalText}!`,
              context: {
                voterName: voter.name || voter.email,
                electionTitle: election.title,
                electionEndDate: new Date(election.end_date).toISOString().split('T')[0],
                electionEndTime: election.end_time,
                electionLink: `${process.env.FRONTEND_URL}/votes/${voter.verification_token}`,
                hoursRemaining: Math.ceil(remainingTimeMs / (1000 * 60 * 60)),
                minutesRemaining: Math.ceil(remainingTimeMs / (1000 * 60)),
                reminderInterval: intervalText,
              },
              template: 'election-reminder',
            },
            template: 'election-reminder',
          }),
        ),
      );

      this.logger.log(
        `Successfully sent ${intervalText} reminders to ${nonVotedVoters.length} voters for election ${election.id}`,
      );

      return {
        success: true,
        message: `Reminder emails sent successfully`,
        sent: nonVotedVoters.length,
      };
    } catch (error) {
      this.logger.error(
        `Failed to send ${intervalText} reminders for election ${election.id}: ${error.message}`,
        error.stack,
      );
      return {
        success: false,
        message: `Failed to send reminder emails: ${error.message}`,
      };
    }
  }

  /**
   * Validates if an election can have a reminder sent at the specified interval
   * @param election The election to check
   * @param reminderInterval The reminder interval to validate
   * @returns Object with validity status and message
   */
  validateReminderInterval(
    election: any,
    reminderInterval: '30min' | '1hour' | '1hour30min',
  ): { valid: boolean; message?: string } {
    // Calculate remaining time in milliseconds
    const electionEndTime = new Date(`${election.end_date}T${election.end_time || '23:59:59'}`).getTime();
    const currentTime = new Date().getTime();
    const remainingTimeMs = electionEndTime - currentTime;

    // Check if election has already ended
    if (remainingTimeMs <= 0) {
      return { valid: false, message: 'Election has already ended' };
    }

    // Convert interval to milliseconds for comparison
    let intervalMs: number;
    let intervalText: string;

    switch (reminderInterval) {
      case '30min':
        intervalMs = 30 * 60 * 1000;
        intervalText = '30 minutes';
        break;
      case '1hour':
        intervalMs = 60 * 60 * 1000;
        intervalText = '1 hour';
        break;
      case '1hour30min':
        intervalMs = 90 * 60 * 1000;
        intervalText = '1 hour and 30 minutes';
        break;
      default:
        return { valid: false, message: 'Invalid reminder interval' };
    }

    // Check if reminder makes sense based on remaining time
    if (remainingTimeMs < intervalMs) {
      return {
        valid: false,
        message: `Cannot send ${intervalText} reminder as the election ends in less than ${intervalText}`,
      };
    }

    return { valid: true };
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
      isWinner: res.votes === highestVotes && res.votes > 0,
      position: res.position,
    }));

    const { filename, csvData } = await this.electionService.getElectionResultsForDownload(
      election.id,
      election.created_by,
    );

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
          },
          template: 'election-results',
          attachments: [
            {
              filename,
              content: csvData,
              contentType: 'text/csv',
            },
          ],
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
