import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Election, ElectionStatus } from '../modules/election/entities/election.entity';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';

@Injectable()
export class ElectionStatusUpdaterService implements OnModuleInit {
  private readonly logger = new Logger(ElectionStatusUpdaterService.name);

  constructor(
    @InjectRepository(Election)
    private electionRepository: Repository<Election>,
    private schedulerRegistry: SchedulerRegistry, // Inject SchedulerRegistry
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
      startJob.start(); // Start the job
    }

    // Schedule end task
    const endDateTime = this.getDateTime(end_date, end_time);
    if (endDateTime > new Date()) {
      const endJob = new CronJob(endDateTime, async () => {
        this.logger.log(`Updating election ${id} from ONGOING to COMPLETED`);
        await this.electionRepository.update(id, { status: ElectionStatus.COMPLETED });
        this.schedulerRegistry.deleteCronJob(`end-${id}`);
      });

      this.schedulerRegistry.addCronJob(`end-${id}`, endJob);
      endJob.start(); // Start the job
    }
  }

  private getDateTime(date: Date, timeString: string): Date {
    const dateTime = new Date(date);
    const [hours, minutes, seconds] = timeString.split(':').map(Number);
    dateTime.setHours(hours, minutes, seconds || 0);
    return dateTime;
  }
}
