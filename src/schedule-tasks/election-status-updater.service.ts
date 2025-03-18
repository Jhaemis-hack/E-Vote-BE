import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Election, ElectionStatus } from '../modules/election/entities/election.entity';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import * as moment from 'moment';
import { clearInterval, setInterval } from 'timers';
// import {NodeJS} from 'node'

@Injectable()
export class ElectionStatusUpdaterService implements OnModuleInit {
  private readonly logger = new Logger(ElectionStatusUpdaterService.name);
  private readonly redisKeyPrefix = 'election:status:';
  private readonly checkInterval = 30000; // Check every 30 seconds
  // eslint-disable-next-line no-undef
  private intervalId: NodeJS.Timeout;

  constructor(
    @InjectRepository(Election)
    private electionRepository: Repository<Election>,
    @InjectRedis() private readonly redis: Redis,
  ) {}

  async onModuleInit() {
    this.logger.log('Initializing ElectionStatusUpdaterService with Redis...');

    // Set up Redis key expiration listener
    this.setupRedisKeyExpirationListener();

    // Load and schedule all elections
    await this.loadAndScheduleElections();

    // Start the periodic check
    this.startPeriodicCheck();
  }

  private async loadAndScheduleElections() {
    const elections = await this.electionRepository.find();
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
          } else if (statusType === 'end') {
            this.logger.log(`Updating election ${electionId} from ONGOING to COMPLETED`);
            await this.updateElectionStatus(electionId, ElectionStatus.COMPLETED);
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
    const { id, start_date, end_date, start_time, end_time } = election;

    // Get the current date/time in UTC
    const currentDate = moment().utc();
    this.logger.log(`Current Date: ${currentDate.format('YYYY-MM-DD HH:mm:ss UTC')}`);

    // Parse start and end date/times in UTC
    const startDateTime = moment
      .utc(`${moment.utc(start_date).format('YYYY-MM-DD')}T${start_time}`)
      .subtract(1, 'hour');
    const endDateTime = moment.utc(`${moment.utc(end_date).format('YYYY-MM-DD')}T${end_time}`).subtract(1, 'hour');

    this.logger.log(`Start Date/Time: ${startDateTime.format('YYYY-MM-DD HH:mm:ss UTC')}`);
    this.logger.log(`End Date/Time: ${endDateTime.format('YYYY-MM-DD HH:mm:ss UTC')}`);

    // Create fresh current date objects for each check
    const currentDateForStart = moment().utc();
    const currentDateForEnd = moment().utc();

    // Store election timing information in Redis
    await this.redis.hset(`${this.redisKeyPrefix}info:${id}`, {
      startDateTime: startDateTime.valueOf(),
      endDateTime: endDateTime.valueOf(),
      status: election.status,
    });

    // Schedule the start update if it's in the future
    if (startDateTime.isAfter(currentDateForStart)) {
      const startKey = `${this.redisKeyPrefix}${id}:start`;
      const ttlSeconds = Math.floor(startDateTime.diff(currentDate) / 1000);

      this.logger.log(`Scheduling start update for election ${id} in ${ttlSeconds} seconds`);
      await this.redis.set(startKey, '1', 'EX', ttlSeconds);
    } else {
      this.logger.log(`Start date/time for election ${id} is in the past or less than 1 hour away`);
      // Check if the status needs to be updated
      if (election.status === ElectionStatus.UPCOMING) {
        await this.updateElectionStatus(id, ElectionStatus.ONGOING);
      }
    }

    // Schedule the end update if it's in the future
    if (endDateTime.isAfter(currentDateForEnd)) {
      const endKey = `${this.redisKeyPrefix}${id}:end`;
      const ttlSeconds = Math.floor(endDateTime.diff(moment().utc()) / 1000);

      this.logger.log(`Scheduling end update for election ${id} in ${ttlSeconds} seconds`);
      await this.redis.set(endKey, '1', 'EX', ttlSeconds);
    } else {
      this.logger.log(`End date/time for election ${id} is in the past or less than 1 hour away`);
      // Check if the status needs to be updated based on current time
      const currentTime = moment().utc();
      if (endDateTime.isBefore(currentTime) && election.status !== ElectionStatus.COMPLETED) {
        await this.updateElectionStatus(id, ElectionStatus.COMPLETED);
      } else if (startDateTime.isBefore(currentTime) && election.status === ElectionStatus.UPCOMING) {
        await this.updateElectionStatus(id, ElectionStatus.ONGOING);
      }
    }
  }

  private async checkAndUpdateElections() {
    // Fetch all elections
    const elections = await this.electionRepository.find();
    const currentTime = moment().utc();

    for (const election of elections) {
      const startDateTime = moment.utc(
        `${moment.utc(election.start_date).format('YYYY-MM-DD')}T${election.start_time}`,
      );
      const endDateTime = moment.utc(`${moment.utc(election.end_date).format('YYYY-MM-DD')}T${election.end_time}`);

      // Check if status needs to be updated
      if (endDateTime.isBefore(currentTime) && election.status !== ElectionStatus.COMPLETED) {
        this.logger.log(`Periodic check: Updating election ${election.id} to COMPLETED`);
        await this.updateElectionStatus(election.id, ElectionStatus.COMPLETED);
      } else if (startDateTime.isBefore(currentTime) && election.status === ElectionStatus.UPCOMING) {
        this.logger.log(`Periodic check: Updating election ${election.id} to ONGOING`);
        await this.updateElectionStatus(election.id, ElectionStatus.ONGOING);
      }
    }
  }

  private async updateElectionStatus(id: string, status: ElectionStatus) {
    try {
      this.logger.log(`Updating election ${id} status to ${status}`);
      const result = await this.electionRepository.update(id, { status });
      this.logger.log(`Election ${id} status updated to ${status}: ${JSON.stringify(result)}`);

      // Update status in Redis
      await this.redis.hset(`${this.redisKeyPrefix}info:${id}`, 'status', status);
    } catch (error) {
      this.logger.error(`Failed to update election ${id} status to ${status}: ${error.message}`);
      throw error;
    }
  }

  async onApplicationShutdown() {
    // Clean up resources
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }
}
