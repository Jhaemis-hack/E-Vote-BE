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
    console.log('startDateTime:', startDateTime);
    console.log('new Date():', new Date());
    if (startDateTime > new Date()) {
      const startJob = new CronJob(startDateTime, async () => {
        this.logger.log(`Updating election ${id} from UPCOMING to ONGOING`);
        await this.electionRepository.update(id, { status: ElectionStatus.ONGOING });

        const updatedElection = await this.electionRepository.findOne({
          where: { id },
          relations: ['voters'],
        });
        if (!updatedElection) {
          this.logger.error(`Election with id ${id} not found!`);
          return;
        }
        if (updatedElection.email_notification) {
          await this.emailService.sendElectionStartEmails(updatedElection);
        }
        this.schedulerRegistry.deleteCronJob(`start-${id}`);
      });

      this.schedulerRegistry.addCronJob(`start-${id}`, startJob);
      startJob.start();
    }

    const endDateTime = this.getDateTime(end_date, end_time);
    this.logger.log(`Calculated endDateTime: ${endDateTime}`);

    if (endDateTime > new Date()) {
      const endJob = new CronJob(endDateTime, async () => {
        this.logger.log(`Cron job triggered for election end at ${new Date()}`);

        this.logger.log(`Updating election ${id} from ONGOING to COMPLETED`);
        await this.electionRepository.update(id, { status: ElectionStatus.COMPLETED });
        this.schedulerRegistry.deleteCronJob(`end-${id}`);
      });

      const updatedElection = await this.electionRepository.findOne({
        where: { id },
        relations: ['voters'],
      });

      if (!updatedElection) {
        this.logger.error(`Election with id ${id} not found!`);
        return;
      }

      if (updatedElection.email_notification) {
        await this.emailService.sendElectionEndEmails(updatedElection);
      }

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
    const utcDateTime = new Date(dateTime.getTime() - 60 * 60 * 1000);
    return utcDateTime;
  }
}
