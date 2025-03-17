import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Election, ElectionStatus } from '../modules/election/entities/election.entity';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { EmailService } from '../modules/email/email.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ElectionStatusUpdaterService {
  private readonly logger = new Logger(ElectionStatusUpdaterService.name);

  constructor(
    @InjectRepository(Election)
    private electionRepository: Repository<Election>,
    private schedulerRegistry: SchedulerRegistry,
    private emailService: EmailService,
    private configService: ConfigService,
  ) {}

  async onModuleInit() {
    // Load all elections and schedule tasks for them
    const elections = await this.electionRepository.find();
    for (const election of elections) {
      await this.scheduleElectionUpdates(election);
    }
  }

  // Public method to schedule updates for a new election
  async scheduleElectionUpdates(election: Election) {
    const { id, start_date, end_date, start_time, end_time } = election;

    // Schedule start task
    const startDateTime = this.getDateTime(start_date, start_time);
    if (startDateTime > new Date()) {
      const startJob = new CronJob(startDateTime, async () => {
        this.logger.log(`Updating election ${id} from UPCOMING to ONGOING`);
        await this.electionRepository.update(id, { status: ElectionStatus.ONGOING });
        this.schedulerRegistry.deleteCronJob(`start-${id}`);
      });

      this.schedulerRegistry.addCronJob(`start-${id}`, startJob);
      startJob.start();
    }

    const endDateTime = this.getDateTime(end_date, end_time);

    const reminderIntervals = [24, 12, 6, 3, 1];

    for (const hours of reminderIntervals) {
      const reminderDateTime = new Date(endDateTime.getTime() - hours * 60 * 60 * 1000);
      if (reminderDateTime > new Date()) {
        const reminderJob = new CronJob(reminderDateTime, async () => {
          try {
            await this.sendReminderNotifications(election, hours);
          } catch (error) {
            this.logger.error(`Error in ${hours}h reminder job for election ${id}: ${error.message}`);
          } finally {
            this.schedulerRegistry.deleteCronJob(`reminder-${hours}h-${id}`);
          }
        });

        this.schedulerRegistry.addCronJob(`reminder-${hours}h-${id}`, reminderJob);
        reminderJob.start();
      }
    }
    // Schedule end task
    if (endDateTime > new Date()) {
      const endJob = new CronJob(endDateTime, async () => {
        this.logger.log(`Updating election ${id} from ONGOING to COMPLETED`);
        await this.electionRepository.update(id, { status: ElectionStatus.COMPLETED });
        this.schedulerRegistry.deleteCronJob(`end-${id}`);
      });

      this.schedulerRegistry.addCronJob(`end-${id}`, endJob);
      endJob.start(); // Start the job
      this.logger.log(`Scheduled end job for election ${id} at ${endDateTime}`);
    } else {
      this.logger.log(`End date/time ${endDateTime} for election ${id} is in the past, not scheduling job.`);
    }
  }

  private async sendReminderNotifications(election: Election, hoursRemaining: number) {
    const completeElection = await this.electionRepository.findOne({
      where: { id: election.id },
      relations: ['voters'],
    });

    if (!completeElection || !completeElection.voters) {
      this.logger.error(`Could not find election ${election.id} with voters for reminder`);
      return;
    }

    if (!completeElection.email_notification) {
      this.logger.log(`Email notifications disabled for election ${election.id}, skipping reminders`);
      return;
    }

    const baseUrl = this.configService.get('FRONTEND_URL');
    const votingLink = `${baseUrl}/elections/${election.id}/vote`;

    const pendingVoters = completeElection.voters.filter(voter => !voter.is_voted);

    for (const voter of pendingVoters) {
      try {
        await this.emailService.sendElectionReminderEmail(
          voter.email,
          election.title,
          this.getDateTime(election.end_date, election.end_time),
          votingLink,
        );
        this.logger.log(`Sent ${hoursRemaining}h reminder to ${voter.email} for election ${election.id}`);
      } catch (error) {
        this.logger.error(`Failed to send ${hoursRemaining}h reminder to ${voter.email}: ${error.message}`);
      }
    }
  }

  private getDateTime(date: Date, timeString: string): Date {
    const dateTime = new Date(date);
    const [hours, minutes, seconds] = timeString.split(':').map(Number);
    dateTime.setHours(hours, minutes, seconds || 0);
    return dateTime;
  }
}
