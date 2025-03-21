import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Election, ElectionStatus } from '../modules/election/entities/election.entity';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { EmailService } from '../modules/email/email.service';
import { Vote } from '../modules/votes/entities/votes.entity';
import { Voter } from '../modules/voter/entities/voter.entity';

@Injectable()
export class ElectionStatusUpdaterService {
  private readonly logger = new Logger(ElectionStatusUpdaterService.name);

  constructor(
    @InjectRepository(Election)
    private electionRepository: Repository<Election>,
    private schedulerRegistry: SchedulerRegistry,
    private emailService: EmailService,
    @InjectRepository(Vote)
    private voteRepository: Repository<Vote>,
    @InjectRepository(Voter)
    private voterRepository: Repository<Voter>,
  ) {}

  async onModuleInit() {
    // Load all elections and schedule tasks for them
    const elections = await this.electionRepository.find({ relations: ['voters', 'created_by_user'] });
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
          relations: ['voters', 'created_by_user'],
        });
        if (!updatedElection) {
          this.logger.error(`Election with id ${id} not found!`);
          return;
        }
        if (updatedElection.email_notification) {
          await this.emailService.sendElectionStartEmails(updatedElection);
        }
        await this.emailService.sendAdminElectionMonitorEmails(updatedElection);

        this.schedulerRegistry.deleteCronJob(`start-${id}`);
      });
      this.schedulerRegistry.addCronJob(`start-${id}`, startJob);
      startJob.start();
    }

    const endDateTime = this.getDateTime(end_date, end_time);
    // Schedule end task
    if (endDateTime > new Date()) {
      const reminderDateTime = new Date(endDateTime.getTime() - 24 * 60 * 60 * 1000);
      if (reminderDateTime > new Date()) {
        const reminderJob = new CronJob(reminderDateTime, async () => {
          this.logger.log(`Sending reminder emails for election ${id}`);

          // Get election with voters
          const electionWithVoters = await this.electionRepository.findOne({
            where: { id },
            relations: ['voters'],
          });

          if (!electionWithVoters) {
            this.logger.error(`Election with id ${id} not found!`);
            return;
          }

          // Find voters who haven't voted yet
          const allVoterIds = electionWithVoters.voters.map(voter => voter.id);
          const votedVoterIds = await this.voteRepository
            .createQueryBuilder('vote')
            .where('vote.electionId = :electionId', { electionId: id })
            .select('vote.voterId')
            .getMany()
            .then(votes => votes.map(vote => vote.voter_id));

          const nonVotedVoterIds = allVoterIds.filter(id => !votedVoterIds.includes(id));

          if (nonVotedVoterIds.length > 0) {
            const nonVotedVoters = electionWithVoters.voters.filter(voter => nonVotedVoterIds.includes(voter.id));

            if (electionWithVoters.email_notification) {
              await this.emailService.sendElectionReminderEmails(electionWithVoters, nonVotedVoters);
            }
          }

          this.schedulerRegistry.deleteCronJob(`reminder-${id}`);
        });

        this.schedulerRegistry.addCronJob(`reminder-${id}`, reminderJob);
        reminderJob.start();
        this.logger.log(`Scheduled reminder job for election ${id} at ${reminderDateTime}`);
      }

      // Schedule interval-based reminders (90 minutes, 60 minutes, 30 minutes)
      const reminderIntervals = [
        { time: 90, key: '1hour30min' },
        { time: 60, key: '1hour' },
        { time: 30, key: '30min' },
      ];

      for (const interval of reminderIntervals) {
        const intervalReminderTime = new Date(endDateTime.getTime() - interval.time * 60 * 1000);

        // Only schedule if this time is in the future
        if (intervalReminderTime > new Date()) {
          const intervalJobName = `reminder-${id}-${interval.key}`;

          const intervalReminderJob = new CronJob(intervalReminderTime, async () => {
            this.logger.log(`Sending ${interval.key} reminder emails for election ${id}`);

            // Get election with voters
            const electionWithVoters = await this.electionRepository.findOne({
              where: { id },
              relations: ['voters', 'created_by_user'],
            });

            if (!electionWithVoters) {
              this.logger.error(`Election with id ${id} not found for ${interval.key} reminder!`);
              return;
            }

            // Find voters who haven't voted yet
            const allVoterIds = electionWithVoters.voters.map(voter => voter.id);
            const votedVoterIds = await this.voteRepository
              .createQueryBuilder('vote')
              .where('vote.electionId = :electionId', { electionId: id })
              .select('vote.voterId')
              .getMany()
              .then(votes => votes.map(vote => vote.voter_id));

            const nonVotedVoterIds = allVoterIds.filter(id => !votedVoterIds.includes(id));

            if (nonVotedVoterIds.length > 0) {
              const nonVotedVoters = electionWithVoters.voters.filter(voter => nonVotedVoterIds.includes(voter.id));

              if (electionWithVoters.email_notification) {
                try {
                  const result = await this.emailService.sendIntervalReminderEmails(
                    electionWithVoters,
                    nonVotedVoters,
                    interval.key as '30min' | '1hour' | '1hour30min',
                  );
                  this.logger.log(`Interval reminder (${interval.key}) result: ${result.message}`);
                } catch (error) {
                  this.logger.error(`Error sending ${interval.key} reminder emails: ${error.message}`);
                }
              }
            }

            this.schedulerRegistry.deleteCronJob(intervalJobName);
          });

          this.schedulerRegistry.addCronJob(intervalJobName, intervalReminderJob);
          intervalReminderJob.start();
          this.logger.log(`Scheduled ${interval.key} reminder job for election ${id} at ${intervalReminderTime}`);
        }
      }
      // ADD INTERVAL REMINDERS HERE - END

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

      this.schedulerRegistry.addCronJob(`end-${id}`, endJob);
      endJob.start();
      this.logger.log(`Scheduled end job for election ${id} at ${endDateTime}`);
    } else {
      this.logger.log(`End date/time ${endDateTime} for election ${id} is in the past, not scheduling job.`);
    }

    const endDateTimeResult = this.getDateTime(end_date, end_time);
    console.log('endDateTime:', endDateTime);
    console.log('Current time:', new Date());

    if (endDateTime > new Date()) {
      const jobName = `end-${id}`;
      if (this.schedulerRegistry.doesExist('cron', jobName)) {
        this.schedulerRegistry.deleteCronJob(jobName);
        this.logger.log(`Deleted existing cron job: ${jobName}`);
      }
      const endJob = new CronJob(
        endDateTime,
        async () => {
          this.logger.log(`Cron job triggered for election end at ${new Date()}`);
          this.logger.log(`Updating election ${id} from ONGOING to COMPLETED`);

          await this.electionRepository.update(id, { status: ElectionStatus.COMPLETED });

          const updatedElection = await this.electionRepository.findOne({
            where: { id },
            relations: ['voters'],
          });

          if (!updatedElection) {
            this.logger.error(`Election with id ${id} not found!`);
            return;
          }

          if (updatedElection.email_notification) {
            this.logger.log('Sending election results to voters...');

            try {
              await this.emailService.sendElectionEndEmails(updatedElection);
              this.logger.log('📩 Email service response: ${JSON.stringify(info)}');
            } catch (error) {
              this.logger.error(`Error sending election result emails: ${error.message}`);
            }
          }

          this.schedulerRegistry.deleteCronJob(jobName);
        },
        null,
        false,
      );

      this.schedulerRegistry.addCronJob(jobName, endJob);
      endJob.start();

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
