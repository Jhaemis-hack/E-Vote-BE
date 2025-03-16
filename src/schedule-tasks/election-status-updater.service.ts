import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Election, ElectionStatus } from '../modules/election/entities/election.entity';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { EmailService } from '../modules/email/email.service';

@Injectable()
export class ElectionStatusUpdaterService {
  private readonly logger = new Logger(ElectionStatusUpdaterService.name);

  constructor(
    @InjectRepository(Election)
    private electionRepository: Repository<Election>,
    private schedulerRegistry: SchedulerRegistry,
    private emailService: EmailService,
  ) {}

  async onModuleInit() {
    // Load all elections and schedule tasks for them
    const elections = await this.electionRepository.find({ relations: ['voters'] });
    for (const election of elections) {
      await this.scheduleElectionUpdates(election);
    }
  }

  async scheduleElectionUpdates(election: Election) {
    const { id, start_date, end_date, start_time, end_time } = election;

    // Schedule start task
    const startDateTime = this.getDateTime(start_date, start_time);
    if (startDateTime > new Date()) {
      const startJob = new CronJob(startDateTime, async () => {
        this.logger.log(`Updating election ${id} from UPCOMING to ONGOING`);
        await this.electionRepository.update(id, { status: ElectionStatus.ONGOING });
        if (election.email_notification) {
          await this.emailService.sendElectionStartEmails(election);
        }
        // Schedule reminder emails for 5 minutes before end time
        const reminderTime = new Date(endDateTime.getTime() - 5 * 60 * 1000);
        if (reminderTime > new Date()) {
          const reminderJob = new CronJob(reminderTime, async () => {
            this.logger.log(`Sending reminder emails for election ${id}`);
            if (election.email_notification) {
              await this.emailService.sendElectionReminderEmails(election, reminderTime);
            }
            this.schedulerRegistry.deleteCronJob(`reminder-${id}`);
          });

          this.schedulerRegistry.addCronJob(`reminder-${id}`, reminderJob);
          reminderJob.start();
          this.logger.log(`Scheduled reminder emails for election ${id} at ${reminderTime}`);
        }

        this.schedulerRegistry.deleteCronJob(`start-${id}`);
      });

      this.schedulerRegistry.addCronJob(`start-${id}`, startJob);
      startJob.start();
    }

    const endDateTime = this.getDateTime(end_date, end_time);
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

  private getDateTime(date: Date, timeString: string): Date {
    const dateTime = new Date(date);
    const [hours, minutes, seconds] = timeString.split(':').map(Number);
    dateTime.setHours(hours, minutes, seconds || 0);
    return dateTime;
  }
}
