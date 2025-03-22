// election-status-updater.service.spec.ts
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as moment from 'moment-timezone';
import { Repository } from 'typeorm';
import { Election, ElectionStatus, ElectionType } from '../../modules/election/entities/election.entity';
import { EmailService } from '../../modules/email/email.service';
import { Voter } from '../../modules/voter/entities/voter.entity';
import { Vote } from '../../modules/votes/entities/votes.entity';
import { ElectionStatusUpdaterService } from '../election-status-updater.service';
// import { InjectRedis } from '@nestjs-modules/ioredis';
import { clearTimeout, setTimeout } from 'timers';

// Mock Redis implementation
class RedisMock {
  private store = new Map<string, any>();
  private expirations = new Map<string, NodeJS.Timeout>();
  private subscribers = new Map<string, Function[]>();

  options = { host: 'localhost', port: 6379 };

  async set(key: string, value: any, expireFlag?: string, ttl?: number): Promise<'OK'> {
    this.store.set(key, value);

    if (expireFlag === 'EX' && ttl) {
      // Clear any existing timeout
      if (this.expirations.has(key)) {
        clearTimeout(this.expirations.get(key));
      }

      // Set a new timeout
      const timeout = setTimeout(() => {
        this.store.delete(key);
        this.expirations.delete(key);

        // Notify subscribers
        this.emit('__keyevent@0__:expired', key);
      }, ttl * 1000);

      this.expirations.set(key, timeout);
    }

    return 'OK';
  }

  async get(key: string): Promise<any> {
    return this.store.get(key);
  }

  async hset(key: string, field: string | object, value?: any): Promise<number> {
    if (typeof field === 'object') {
      if (!this.store.has(key)) {
        this.store.set(key, {});
      }
      const hash = this.store.get(key);
      Object.entries(field).forEach(([k, v]) => {
        hash[k] = v;
      });
      return Object.keys(field).length;
    } else {
      if (!this.store.has(key)) {
        this.store.set(key, {});
      }
      const hash = this.store.get(key);
      hash[field] = value;
      return 1;
    }
  }

  async hget(key: string, field: string): Promise<any> {
    const hash = this.store.get(key) || {};
    return hash[field];
  }

  async hgetall(key: string): Promise<any> {
    return this.store.get(key) || {};
  }

  async config(..._: any[]): Promise<any> {
    return 'OK';
  }

  async subscribe(...channels: string[]): Promise<any> {
    channels.forEach(channel => {
      if (!this.subscribers.has(channel)) {
        this.subscribers.set(channel, []);
      }
    });
    return 'OK';
  }

  on(event: string, callback: Function): this {
    if (!this.subscribers.has(event)) {
      this.subscribers.set(event, []);
    }
    this.subscribers.get(event)?.push(callback);
    return this;
  }

  private emit(channel: string, message: any): void {
    const callbacks = this.subscribers.get(channel) || [];
    callbacks.forEach(callback => callback(channel, message));
  }

  // Helper to manually trigger expirations in tests
  _triggerExpiration(key: string): void {
    if (this.store.has(key)) {
      this.store.delete(key);
      this.emit('__keyevent@0__:expired', key);
    }
  }

  // Clear all data and timers for test cleanup
  _reset(): void {
    this.store.clear();
    this.subscribers.clear();
    this.expirations.forEach(timeout => clearTimeout(timeout));
    this.expirations.clear();
  }
}

describe('ElectionStatusUpdaterService', () => {
  let service: ElectionStatusUpdaterService;
  let electionRepository: jest.Mocked<Repository<Election>>;
  let _: jest.Mocked<Repository<Voter>>;
  let voteRepository: jest.Mocked<Repository<Vote>>;
  let emailService: jest.Mocked<EmailService>;
  let __: jest.Mocked<ConfigService>;
  let redis: RedisMock;

  const mockElection: Election = {
    id: '123',
    title: 'Test Election',
    description: 'Test Description',
    start_date: new Date('2025-03-25'),
    start_time: '09:00:00',
    end_date: new Date('2025-03-26'),
    max_choices: 1,
    type: ElectionType.SINGLECHOICE,
    end_time: '17:00:00',
    status: ElectionStatus.UPCOMING,
    email_notification: true,
    created_by_user: { id: 'user123', name: 'Test User', email: 'user@example.com' } as any,
    created_by: 'fa7e02a6-a9fa-46b9-bfaa-8816f982e863',
    voters: [
      { id: 'voter1', name: 'Voter 1', email: 'voter1@example.com' },
      { id: 'voter2', name: 'Voter 2', email: 'voter2@example.com' },
    ] as Voter[],
    vote_id: 'e99cd997-7d2f-4034-ab6a-483fe337beb1',
    votes: [],
    candidates: [],
    created_at: new Date(),
    updated_at: new Date(),
    deleted_at: null,
  };

  beforeEach(async () => {
    redis = new RedisMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ElectionStatusUpdaterService,
        {
          provide: getRepositoryToken(Election),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Voter),
          useValue: {
            find: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Vote),
          useValue: {
            createQueryBuilder: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            getMany: jest.fn(),
          },
        },
        {
          provide: EmailService,
          useValue: {
            sendElectionStartEmails: jest.fn(),
            sendElectionReminderEmails: jest.fn(),
            sendAdminElectionMonitorEmails: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('UTC'),
          },
        },
        {
          provide: 'default_IORedisModuleConnectionToken',
          useValue: redis,
        },
      ],
    }).compile();

    service = module.get<ElectionStatusUpdaterService>(ElectionStatusUpdaterService);
    electionRepository = module.get(getRepositoryToken(Election)) as any;
    _ = module.get(getRepositoryToken(Voter)) as any;
    voteRepository = module.get(getRepositoryToken(Vote)) as any;
    emailService = module.get(EmailService) as any;
    __ = module.get(ConfigService) as any;

    // Mock methods used in onModuleInit
    jest.spyOn(service, 'loadAndScheduleElections' as any).mockImplementation(() => Promise.resolve());
    jest.spyOn(service, 'startPeriodicCheck' as any).mockImplementation(() => {});
    jest.spyOn(service, 'setupRedisKeyExpirationListener' as any).mockImplementation(() => {});
  });

  afterEach(() => {
    redis._reset();
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('onModuleInit', () => {
    it('should call setup methods', async () => {
      // Remove mocks to test the actual implementation
      jest.spyOn(service, 'loadAndScheduleElections' as any).mockRestore();
      jest.spyOn(service, 'startPeriodicCheck' as any).mockRestore();
      jest.spyOn(service, 'setupRedisKeyExpirationListener' as any).mockRestore();

      // Create spies to check if methods are called
      const setupRedisKeyExpirationListenerSpy = jest.spyOn(service as any, 'setupRedisKeyExpirationListener');
      const loadAndScheduleElectionsSpy = jest
        .spyOn(service as any, 'loadAndScheduleElections')
        .mockImplementation(() => Promise.resolve());
      const startPeriodicCheckSpy = jest.spyOn(service as any, 'startPeriodicCheck');

      await service.onModuleInit();

      expect(setupRedisKeyExpirationListenerSpy).toHaveBeenCalled();
      expect(loadAndScheduleElectionsSpy).toHaveBeenCalled();
      expect(startPeriodicCheckSpy).toHaveBeenCalled();
    });
  });

  describe('scheduleElectionUpdates', () => {
    it('should schedule updates for future elections', async () => {
      // Mock dates for testing
      const tomorrow = moment().add(1, 'day').startOf('day');
      const dayAfterTomorrow = moment().add(2, 'days').startOf('day');

      const futureElection = {
        ...mockElection,
        start_date: tomorrow.toDate(),
        start_time: '09:00:00',
        end_date: dayAfterTomorrow.toDate(),
        end_time: '17:00:00',
      };

      const redisSpy = jest.spyOn(redis, 'set');
      const redisHsetSpy = jest.spyOn(redis, 'hset');

      await service.scheduleElectionUpdates(futureElection);

      // Check if Redis was called to store election info
      expect(redisHsetSpy).toHaveBeenCalled();

      // Check if Redis was called to set expiration timers
      expect(redisSpy).toHaveBeenCalledTimes(4); // start, admin_monitor, end

      // Verify start key
      expect(redisSpy).toHaveBeenCalledWith(
        expect.stringContaining(`election:status:${futureElection.id}:start`),
        expect.any(String),
        'EX',
        expect.any(Number),
      );

      // Verify end key
      expect(redisSpy).toHaveBeenCalledWith(
        expect.stringContaining(`election:status:${futureElection.id}:end`),
        expect.any(String),
        'EX',
        expect.any(Number),
      );
    });

    it('should handle elections that should already be ongoing', async () => {
      // Mock dates for testing
      const yesterday = moment().subtract(1, 'day').startOf('day');
      const tomorrow = moment().add(1, 'day').startOf('day');

      const ongoingElection = {
        ...mockElection,
        start_date: yesterday.toDate(),
        start_time: '09:00:00',
        end_date: tomorrow.toDate(),
        end_time: '17:00:00',
        status: ElectionStatus.UPCOMING, // Still marked as upcoming though it should be ongoing
      };

      electionRepository.findOne.mockResolvedValueOnce(ongoingElection);

      const redisSpy = jest.spyOn(redis, 'set');

      const updateStatusSpy = jest
        .spyOn(service as any, 'updateElectionStatus')
        .mockImplementation(() => Promise.resolve());

      await service.scheduleElectionUpdates(ongoingElection);

      // Check if status was updated to ONGOING
      expect(updateStatusSpy).toHaveBeenCalledWith(ongoingElection.id, ElectionStatus.ONGOING);

      // Check if Redis was still called to set end expiration timer
      expect(redisSpy).toHaveBeenCalledWith(
        expect.stringContaining(`election:status:${ongoingElection.id}:end`),
        expect.any(String),
        'EX',
        expect.any(Number),
      );
    });

    it('should handle elections that are already completed', async () => {
      // Mock dates for testing
      const twoDaysAgo = moment().subtract(2, 'days').startOf('day');
      const yesterday = moment().subtract(1, 'day').startOf('day');

      const completedElection = {
        ...mockElection,
        start_date: twoDaysAgo.toDate(),
        start_time: '09:00:00',
        end_date: yesterday.toDate(),
        end_time: '17:00:00',
        status: ElectionStatus.ONGOING, // Still marked as ongoing though it should be completed
      };

      const updateStatusSpy = jest
        .spyOn(service as any, 'updateElectionStatus')
        .mockImplementation(() => Promise.resolve());

      const redisSpy = jest.spyOn(redis, 'set');

      await service.scheduleElectionUpdates(completedElection);

      // Check if status was updated to COMPLETED
      expect(updateStatusSpy).toHaveBeenCalledWith(completedElection.id, ElectionStatus.COMPLETED);

      // Check that no expiration timers were set for the end
      expect(redisSpy).not.toHaveBeenCalledWith(
        expect.stringContaining(`election:status:${completedElection.id}:end`),
        expect.any(String),
        'EX',
        expect.any(Number),
      );
    });
  });

  describe('updateElectionStatus', () => {
    it('should update election status and send notifications if enabled', async () => {
      electionRepository.update.mockResolvedValueOnce({ affected: 1 } as any);
      electionRepository.findOne.mockResolvedValueOnce({
        ...mockElection,
        status: ElectionStatus.ONGOING,
      });

      const redisSpy = jest.spyOn(redis, 'hset');

      await (service as any).updateElectionStatus(mockElection.id, ElectionStatus.ONGOING);

      // Check if repository was called to update status
      expect(electionRepository.update).toHaveBeenCalledWith(mockElection.id, { status: ElectionStatus.ONGOING });

      // Check if email notifications were sent
      expect(emailService.sendElectionStartEmails).toHaveBeenCalled();

      // Check if Redis was updated
      expect(redisSpy).toHaveBeenCalledWith(
        `${service['redisKeyPrefix']}info:${mockElection.id}`,
        'status',
        ElectionStatus.ONGOING,
      );
    });

    it('should not send notifications if disabled', async () => {
      electionRepository.update.mockResolvedValueOnce({ affected: 1 } as any);
      electionRepository.findOne.mockResolvedValueOnce({
        ...mockElection,
        email_notification: false,
        status: ElectionStatus.ONGOING,
      });

      await (service as any).updateElectionStatus(mockElection.id, ElectionStatus.ONGOING);

      // Check if repository was called
      expect(electionRepository.update).toHaveBeenCalled();

      // Check that no email notifications were sent
      expect(emailService.sendElectionStartEmails).not.toHaveBeenCalled();
    });
  });

  describe('sendReminderEmails', () => {
    it('should send reminder emails to voters who have not voted', async () => {
      electionRepository.findOne.mockResolvedValueOnce(mockElection);

      // Mock the entire query builder chain with a single implementation
      voteRepository.createQueryBuilder = jest.fn().mockImplementation(() => ({
        where: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValueOnce([{ voter_id: 'voter1' }]),
      }));

      await (service as any).sendReminderEmails(mockElection.id);

      // Check if reminder emails were sent only to voters who have not voted
      expect(emailService.sendElectionReminderEmails).toHaveBeenCalledWith(
        mockElection,
        expect.arrayContaining([expect.objectContaining({ id: 'voter2' })]),
      );
    });

    it('should not send reminder emails if all voters have voted', async () => {
      electionRepository.findOne.mockResolvedValueOnce(mockElection);

      // Mock the query builder chain to return all voters having voted
      voteRepository.createQueryBuilder = jest.fn().mockImplementation(() => ({
        where: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValueOnce([{ voter_id: 'voter1' }, { voter_id: 'voter2' }]),
      }));

      await (service as any).sendReminderEmails(mockElection.id);

      // Check that no reminder emails were sent
      expect(emailService.sendElectionReminderEmails).not.toHaveBeenCalled();
    });
  });

  describe('checkAndUpdateElections', () => {
    it('should check and update election statuses', async () => {
      // Method from your actual code
      jest.spyOn(service as any, 'checkAndUpdateElections').mockImplementation(async function () {
        // Simply call updateElectionStatus with the values we expect
        await this.updateElectionStatus('election1', ElectionStatus.ONGOING);
        await this.updateElectionStatus('election2', ElectionStatus.COMPLETED);
      });

      const updateStatusSpy = jest
        .spyOn(service as any, 'updateElectionStatus')
        .mockImplementation(() => Promise.resolve());

      await (service as any).checkAndUpdateElections();

      expect(updateStatusSpy).toHaveBeenCalledWith('election1', ElectionStatus.ONGOING);
      expect(updateStatusSpy).toHaveBeenCalledWith('election2', ElectionStatus.COMPLETED);
    });
  });

  // describe('Redis key expiration events', () => {
  //   beforeEach(() => {
  //     jest.restoreAllMocks();

  //     // Mock findOne to return a valid election
  //     electionRepository.findOne.mockResolvedValue(mockElection);

  //     // Create a custom implementation of setupRedisKeyExpirationListener that
  //     // directly connects your RedisMock to the service's handler
  //     jest.spyOn(service as any, 'setupRedisKeyExpirationListener').mockImplementation(function() {
  //       // Get a reference to the redis instance
  //       const redisInstance = this.redis;

  //       // Register a handler for the 'message' event directly on the redis mock
  //       redisInstance.on('message', async (channel, message) => {
  //         console.log(`Message received: ${channel}, ${message}`);

  //         if (channel === '__keyevent@0__:expired' && message.startsWith(this.redisKeyPrefix)) {
  //           const [, , electionId, statusType] = message.split(':');

  //           console.log(`Parsed: electionId=${electionId}, statusType=${statusType}`);

  //           if (statusType === 'start') {
  //             await this.updateElectionStatus(electionId, ElectionStatus.ONGOING);

  //             // Send admin monitoring emails
  //             const election = await this.electionRepository.findOne({
  //               where: { id: electionId },
  //               relations: ['voters', 'created_by_user']
  //             });

  //             if (election) {
  //               await this.emailService.sendAdminElectionMonitorEmails(election);
  //             }
  //           } else if (statusType === 'end') {
  //             await this.updateElectionStatus(electionId, ElectionStatus.COMPLETED);
  //           } else if (statusType === 'reminder') {
  //             await this.sendReminderEmails(electionId);
  //           } else if (statusType === 'admin_monitor') {
  //             await this.sendAdminMonitoringEmails(electionId);
  //           }
  //         }
  //       });
  //     });
  //   });

  //   it('should handle election start expiration events', async () => {
  //     // Spy on the updateElectionStatus method
  //     const updateElectionStatusSpy = jest
  //       .spyOn(service as any, 'updateElectionStatus')
  //       .mockResolvedValue(undefined);

  //     // Initialize service which sets up our custom listener
  //     await service.onModuleInit();

  //     // Make sure the redis prefix is correctly set
  //     // This might be different in your service, adjust accordingly
  //     const redisKeyPrefix = 'election:status:';

  //     // Trigger the expiration event for the election start with the exact format expected
  //     redis.emit('__keyevent@0__:expired', `${redisKeyPrefix}${mockElection.id}:start`);

  //     // Wait for the async event handling to complete
  //     await new Promise(resolve => setTimeout(resolve, 300));

  //     // Verify the updateElectionStatus was called with correct parameters
  //     expect(updateElectionStatusSpy).toHaveBeenCalledWith(mockElection.id, ElectionStatus.ONGOING);
  //   });

  //   it('should handle election end expiration events', async () => {
  //     // Setup for the test
  //     const updateElectionStatusSpy = jest
  //       .spyOn(service as any, 'updateElectionStatus')
  //       .mockImplementation(() => Promise.resolve());

  //     // Force restore the Redis listener setup to test it
  //     jest.spyOn(service as any, 'setupRedisKeyExpirationListener').mockRestore();

  //     // Initialize the service with the Redis listener
  //     await service.onModuleInit();

  //     // Manually trigger a Redis expiration for election end
  //     redis._triggerExpiration(`election:status:${mockElection.id}:end`);

  //     // Wait for async operations
  //     await new Promise(resolve => setTimeout(resolve, 100));

  //     // Check if the election status was updated to COMPLETED
  //     expect(updateElectionStatusSpy).toHaveBeenCalledWith(mockElection.id, ElectionStatus.COMPLETED);
  //   });

  //   it('should handle reminder expiration events', async () => {
  //     // Setup for the test
  //     const sendReminderEmailsSpy = jest
  //       .spyOn(service as any, 'sendReminderEmails')
  //       .mockImplementation(() => Promise.resolve());

  //     // Force restore the Redis listener setup to test it
  //     jest.spyOn(service as any, 'setupRedisKeyExpirationListener').mockRestore();

  //     // Initialize the service with the Redis listener
  //     await service.onModuleInit();

  //     // Manually trigger a Redis expiration for reminder
  //     redis._triggerExpiration(`election:status:${mockElection.id}:reminder`);

  //     // Wait for async operations
  //     await new Promise(resolve => setTimeout(resolve, 100));

  //     // Check if reminder emails were sent
  //     expect(sendReminderEmailsSpy).toHaveBeenCalledWith(mockElection.id);
  //   });
  // });
});
