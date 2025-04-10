import { InjectRedis } from '@nestjs-modules/ioredis';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import Redis from 'ioredis';
import * as moment from 'moment-timezone';
import { clearInterval, setInterval } from 'timers';
import { Repository } from 'typeorm';
import { Election, ElectionStatus } from '../modules/election/entities/election.entity';
import { EmailService } from '../modules/email/email.service';
import { Voter } from '../modules/voter/entities/voter.entity';
import { Vote } from '../modules/votes/entities/votes.entity';

@Injectable()
export class ElectionStatusUpdaterService {
  private readonly logger = new Logger(ElectionStatusUpdaterService.name);
  private readonly redisKeyPrefix = 'election:status:';
  private readonly checkInterval = 30000; // Check every 30 seconds
  private readonly applicatonTimeZone: string;

  private intervalId: NodeJS.Timeout;

  constructor(
    @InjectRepository(Election)
    private electionRepository: Repository<Election>,
    @InjectRedis() private readonly redis: Redis,
    private emailService: EmailService,
    @InjectRepository(Vote)
    private voteRepository: Repository<Vote>,
    @InjectRepository(Voter)
    private voterRepository: Repository<Voter>,
    private configService: ConfigService,
  ) {
    this.applicatonTimeZone = this.configService.get<string>('APP_TIMEZONE', 'UTC');
    this.logger.log(`Application timezone set to : ${this.applicatonTimeZone}`);
  }

  async onModuleInit() {
    this.logger.log('Initializing ElectionStatusUpdaterService with Redis...');

    // Set up Redis key expiration listener
    this.setupRedisKeyExpirationListener();

    // Load and schedule all elections
    await this.loadAndScheduleElections();

    // Start the periodic check as a fallback mechanism
    this.startPeriodicCheck();
  }

  private async loadAndScheduleElections() {
    const elections = await this.electionRepository.find({ relations: ['voters', 'created_by_user'] });
    this.logger.log(`Found ${elections.length} elections to schedule`);

    for (const election of elections) {
      await this.scheduleElectionUpdates(election);
    }
  }

  private setupRedisKeyExpirationListener() {
    // Configure Redis to notify about expired keys
    this.redis.config('SET', 'notify-keyspace-events', 'Ex').catch(error => {
      this.logger.error(`Failed to configure Redis: ${error.message}`);
    });

    // Create a separate Redis client for the subscription
    const subClient = new Redis(this.redis.options);

    // Subscribe to expired events
    subClient.subscribe('__keyevent@0__:expired').catch(error => {
      this.logger.error(`Failed to subscribe to Redis events: ${error.message}`);
    });

    subClient.on('message', async (channel, message) => {
      if (channel === '__keyevent@0__:expired' && message.startsWith(this.redisKeyPrefix)) {
        const [, , electionId, statusType] = message.split(':');

        try {
          if (statusType === 'start') {
            this.logger.log(`Updating election ${electionId} from UPCOMING to ONGOING`);
            await this.updateElectionStatus(electionId, ElectionStatus.ONGOING);

            // Send admin monitoring emails when election starts
            const election = await this.electionRepository.findOne({
              where: { id: electionId },
              relations: ['voters', 'created_by_user'],
            });

            if (election) {
              await this.emailService.sendAdminElectionMonitorEmails(election);
            }
          } else if (statusType === 'end') {
            this.logger.log(`Updating election ${electionId} from ONGOING to COMPLETED`);
            await this.updateElectionStatus(electionId, ElectionStatus.COMPLETED);

            // Send end election emails
            const election = await this.electionRepository.findOne({
              where: { id: electionId },
              relations: ['voters', 'created_by_user'],
            });

            if (election && election.email_notification) {
              try {
                await this.emailService.sendElectionEndEmails(election);
                this.logger.log(`Election end emails sent for election ${electionId}`);

                if (election.created_by_user && election.created_by_user.email) {
                  await this.emailService.sendResultsToAdminEmail(election.created_by_user.email, election);
                  this.logger.log(`Results sent to admin: ${election.created_by_user.email}`);
                } else {
                  this.logger.error('Admin email not found. Unable to send results to admin.');
                }
              } catch (error) {
                this.logger.error(`Error sending election result emails: ${error.message}`);
              }
            }
          } else if (statusType === 'reminder') {
            this.logger.log(`Sending 24-hour reminder for election ${electionId}`);
            await this.sendReminderEmails(electionId);
          } else if (statusType === 'reminder_90min') {
            this.logger.log(`Sending 90-minute reminder for election ${electionId}`);
            await this.sendIntervalReminderEmails(electionId, '1hour30min');
          } else if (statusType === 'reminder_60min') {
            this.logger.log(`Sending 60-minute reminder for election ${electionId}`);
            await this.sendIntervalReminderEmails(electionId, '1hour');
          } else if (statusType === 'reminder_30min') {
            this.logger.log(`Sending 30-minute reminder for election ${electionId}`);
            await this.sendIntervalReminderEmails(electionId, '30min');
          } else if (statusType === 'admin_monitor') {
            this.logger.log(`Sending admin monitoring emails for election ${electionId}`);
            await this.sendAdminMonitoringEmails(electionId);
          }
        } catch (error) {
          this.logger.error(`Failed to process expired key ${message}: ${error.message}`);
        }
      }
    });
  }

  private startPeriodicCheck() {
    // Set up a periodic check as a fallback mechanism
    this.intervalId = setInterval(async () => {
      try {
        await this.checkAndUpdateElections();
      } catch (error) {
        this.logger.error(`Periodic check failed: ${error.message}`);
      }
    }, this.checkInterval);
  }

  async scheduleElectionUpdates(election: Election) {
    const { id, start_date, start_time, end_date, end_time } = election;

    const electionTimezone = this.applicatonTimeZone;

    // Get the current date/time in UTC
    const currentDate = moment().utc();
    this.logger.log(`Current Date: ${currentDate.format('YYYY-MM-DD HH:mm:ss UTC')}`);

    // Parse start and end date/times in UTC
    const startDateStr = moment(start_date).format('YYYY-MM-DD');
    const startDateTime = moment.tz(`${startDateStr}T${start_time}`, electionTimezone).utc();

    const endDateStr = moment(end_date).format('YYYY-MM-DD');
    const endDateTime = moment.tz(`${endDateStr}T${end_time}`, electionTimezone).utc();

    this.logger.log(
      `Election ${id} timing (${electionTimezone}):
      Start: ${startDateTime.clone().tz(electionTimezone).format('YYYY-MM-DD HH:mm:ss')} (${startDateTime.format('YYYY-MM-DD HH:mm:ss')} UTC)
      End: ${endDateTime.clone().tz(electionTimezone).format('YYYY-MM-DD HH:mm:ss')} (${endDateTime.format('YYYY-MM-DD HH:mm:ss')} UTC)`,
    );

    // Store election timing information in Redis
    await this.redis.hset(`${this.redisKeyPrefix}info:${id}`, {
      startDateTime: startDateTime.valueOf(),
      endDateTime: endDateTime.valueOf(),
      status: election.status,
    });

    // Schedule the start update if it's in the future
    if (startDateTime.isAfter(currentDate)) {
      const startKey = `${this.redisKeyPrefix}${id}:start`;
      const ttlSeconds = Math.floor(startDateTime.diff(currentDate) / 1000);

      this.logger.log(`Scheduling start update for election ${id} in ${ttlSeconds} seconds`);
      await this.redis.set(startKey, '1', 'EX', ttlSeconds);

      // Schedule admin monitoring emails to be sent at the same time
      const adminMonitorKey = `${this.redisKeyPrefix}${id}:admin_monitor`;
      await this.redis.set(adminMonitorKey, '1', 'EX', ttlSeconds);
    } else {
      this.logger.log(`Start date/time for election ${id} is in the past`);
      if (election.status === ElectionStatus.UPCOMING) {
        await this.updateElectionStatus(id, ElectionStatus.ONGOING);

        // Send admin monitoring emails immediately if election should be ongoing
        const updatedElection = await this.electionRepository.findOne({
          where: { id },
          relations: ['voters', 'created_by_user'],
        });
        if (updatedElection) {
          await this.emailService.sendAdminElectionMonitorEmails(updatedElection);
        }
      }
    }

    // Schedule the end update if it's in the future
    if (endDateTime.isAfter(currentDate)) {
      const endKey = `${this.redisKeyPrefix}${id}:end`;
      const ttlSeconds = Math.floor(endDateTime.diff(currentDate) / 1000);

      this.logger.log(`Scheduling end update for election ${id} in ${ttlSeconds} seconds`);
      await this.redis.set(endKey, '1', 'EX', ttlSeconds);

      // Schedule a reminder 24 hours before the election ends
      const reminderDateTime = moment(endDateTime).subtract(24, 'hours');
      if (reminderDateTime.isAfter(currentDate)) {
        const reminderKey = `${this.redisKeyPrefix}${id}:reminder`;
        const reminderTtlSeconds = Math.floor(reminderDateTime.diff(currentDate) / 1000);

        this.logger.log(`Scheduling reminder for election ${id} in ${reminderTtlSeconds} seconds`);
        await this.redis.set(reminderKey, '1', 'EX', reminderTtlSeconds);
      }

      // Schedule interval-based reminders (90 minutes, 60 minutes, 30 minutes)
      const reminderIntervals = [
        { time: 90, key: 'reminder_90min' },
        { time: 60, key: 'reminder_60min' },
        { time: 30, key: 'reminder_30min' },
      ];

      for (const interval of reminderIntervals) {
        const intervalReminderTime = moment(endDateTime).subtract(interval.time, 'minutes');

        // Only schedule if this time is in the future
        if (intervalReminderTime.isAfter(currentDate)) {
          const intervalKey = `${this.redisKeyPrefix}${id}:${interval.key}`;
          const intervalTtlSeconds = Math.floor(intervalReminderTime.diff(currentDate) / 1000);

          this.logger.log(
            `Scheduling ${interval.time}-minute reminder for election ${id} in ${intervalTtlSeconds} seconds`,
          );
          await this.redis.set(intervalKey, '1', 'EX', intervalTtlSeconds);
        }
      }
    } else {
      this.logger.log(`End date/time for election ${id} is in the past`);
      if (election.status !== ElectionStatus.COMPLETED) {
        await this.updateElectionStatus(id, ElectionStatus.COMPLETED);
      }
    }
  }

  private async checkAndUpdateElections() {
    const elections = await this.electionRepository.find({ relations: ['voters', 'created_by_user'] });
    const currentTime = moment().utc();

    for (const election of elections) {
      const electionTimeZone = this.applicatonTimeZone;
      const startDateTime = moment
        .utc(`${moment.utc(election.start_date).format('YYYY-MM-DD')}T${election.start_time}`, electionTimeZone)
        .utc();
      const endDateTime = moment
        .utc(`${moment.utc(election.end_date).format('YYYY-MM-DD')}T${election.end_time}`, electionTimeZone)
        .utc();

      if (endDateTime.isBefore(currentTime) && election.status !== ElectionStatus.COMPLETED) {
        this.logger.log(`Periodic check: Updating election ${election.id} to COMPLETED`);
        await this.updateElectionStatus(election.id, ElectionStatus.COMPLETED);
      } else if (startDateTime.isBefore(currentTime) && election.status === ElectionStatus.UPCOMING) {
        this.logger.log(`Periodic check: Updating election ${election.id} to ONGOING`);
        await this.updateElectionStatus(election.id, ElectionStatus.ONGOING);

        // Send admin monitoring emails
        await this.emailService.sendAdminElectionMonitorEmails(election);
      }
    }
  }

  private async updateElectionStatus(id: string, status: ElectionStatus) {
    try {
      this.logger.log(`Updating election ${id} status to ${status}`);
      await this.electionRepository.update(id, { status });

      const updatedElection = await this.electionRepository.findOne({
        where: { id },
        relations: ['voters', 'created_by_user'],
      });

      if (!updatedElection) {
        this.logger.error(`Election with id ${id} not found!`);
        return;
      }

      // Send email notifications if enabled
      if (updatedElection.email_notification) {
        if (status === ElectionStatus.ONGOING) {
          try {
            await this.emailService.sendElectionStartEmails(updatedElection);
            this.logger.log(`Start email notifications sent for election ${id}`);
          } catch (error) {
            this.logger.error(`Failed to send start email notifications for election ${id}: ${error.message}`);
          }
        } else if (status === ElectionStatus.COMPLETED) {
          try {
            await this.emailService.sendElectionEndEmails(updatedElection);
            this.logger.log(`End email notifications sent for election ${id}`);

            if (updatedElection.created_by_user && updatedElection.created_by_user.email) {
              await this.emailService.sendResultsToAdminEmail(updatedElection.created_by_user.email, updatedElection);
              this.logger.log(`Results sent to admin: ${updatedElection.created_by_user.email}`);
            }
          } catch (error) {
            this.logger.error(`Failed to send end email notifications for election ${id}: ${error.message}`);
          }
        }
      }

      // Update status in Redis
      await this.redis.hset(`${this.redisKeyPrefix}info:${id}`, 'status', status);
    } catch (error) {
      this.logger.error(`Failed to update election ${id} status to ${status}: ${error.message}`);
      throw error;
    }
  }

  private async sendReminderEmails(electionId: string) {
    const election = await this.electionRepository.findOne({
      where: { id: electionId },
      relations: ['voters'],
    });

    if (!election) {
      this.logger.error(`Election with id ${electionId} not found!`);
      return;
    }

    const allVoterIds = election.voters.map(voter => voter.id);
    const votedVoterIds = await this.voteRepository
      .createQueryBuilder('vote')
      .where('vote.electionId = :electionId', { electionId })
      .select('vote.voterId')
      .getMany()
      .then(votes => votes.map(vote => vote.voter_id));

    const nonVotedVoterIds = allVoterIds.filter(id => !votedVoterIds.includes(id));

    if (nonVotedVoterIds.length > 0) {
      const nonVotedVoters = election.voters.filter(voter => nonVotedVoterIds.includes(voter.id));

      if (election.email_notification) {
        try {
          await this.emailService.sendElectionReminderEmails(election, nonVotedVoters);
          this.logger.log(`Reminder emails sent for election ${electionId}`);
        } catch (error) {
          this.logger.error(`Failed to send reminder emails for election ${electionId}: ${error.message}`);
        }
      }
    }
  }

  private async sendIntervalReminderEmails(electionId: string, interval: '30min' | '1hour' | '1hour30min') {
    const election = await this.electionRepository.findOne({
      where: { id: electionId },
      relations: ['voters'],
    });

    if (!election) {
      this.logger.error(`Election with id ${electionId} not found!`);
      return;
    }

    const allVoterIds = election.voters.map(voter => voter.id);
    const votedVoterIds = await this.voteRepository
      .createQueryBuilder('vote')
      .where('vote.electionId = :electionId', { electionId })
      .select('vote.voterId')
      .getMany()
      .then(votes => votes.map(vote => vote.voter_id));

    const nonVotedVoterIds = allVoterIds.filter(id => !votedVoterIds.includes(id));

    if (nonVotedVoterIds.length > 0) {
      const nonVotedVoters = election.voters.filter(voter => nonVotedVoterIds.includes(voter.id));

      if (election.email_notification) {
        try {
          const result = await this.emailService.sendIntervalReminderEmails(election, nonVotedVoters, interval);
          this.logger.log(`Interval reminder (${interval}) result: ${result.message}`);
        } catch (error) {
          this.logger.error(`Error sending ${interval} reminder emails: ${error.message}`);
        }
      }
    }
  }

  private async sendAdminMonitoringEmails(electionId: string) {
    const election = await this.electionRepository.findOne({
      where: { id: electionId },
      relations: ['voters', 'created_by_user'],
    });

    if (!election) {
      this.logger.error(`Election with id ${electionId} not found!`);
      return;
    }

    try {
      await this.emailService.sendAdminElectionMonitorEmails(election);
      this.logger.log(`Admin monitoring emails sent for election ${electionId}`);
    } catch (error) {
      this.logger.error(`Failed to send admin monitoring emails for election ${electionId}: ${error.message}`);
    }
  }

  async onApplicationShutdown() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }
}
