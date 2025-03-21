import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DeepPartial, Repository } from 'typeorm';
import { ElectionStatusUpdaterService } from '../../../schedule-tasks/election-status-updater.service';
import * as SYS_MSG from '../../../shared/constants/systemMessages';
import { Candidate } from '../../candidate/entities/candidate.entity';
import { User } from '../../user/entities/user.entity';
import { Vote } from '../../votes/entities/votes.entity';
import { CreateElectionDto } from '../dto/create-election.dto';
import { ElectionService } from '../election.service';
import { Election, ElectionStatus, ElectionType } from '../entities/election.entity';
import { NotificationSettingsDto } from '../../notification/dto/notification-settings.dto';
import { EmailService } from '../../email/email.service';
import { Voter } from '../../voter/entities/voter.entity';
import { VoterService } from '../../voter/voter.service';

describe('ElectionService', () => {
  let service: ElectionService;
  let electionRepository: Repository<Election>;
  let candidateRepository: Repository<Candidate>;
  let voteRepository: Repository<Vote>;
  let voterRepository: Repository<Voter>;
  let userRepository: Repository<User>;
  let emailService: EmailService;
  let voterService: VoterService;

  const mockElectionRepository = () => ({
    findAndCount: jest.fn().mockResolvedValue([[], 0]),
    create: jest.fn().mockImplementation((data: Partial<Election>) => ({
      ...data,
      id: '550e8400-e29b-41d4-a716-446655440000',
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      vote_id: '7284fdbc-a1b9-45ad-a586-72edae14526d',
      created_by_user: {} as User,
      candidates: [] as Candidate[],
      votes: [] as Vote[],
    })),
    save: jest
      .fn()
      .mockImplementation((entity: DeepPartial<Election>) => Promise.resolve(Object.assign(new Election(), entity))),
    findOne: jest.fn().mockResolvedValue(null),
    delete: jest.fn(),
    update: jest.fn().mockResolvedValue({}),
  });

  const mockCandidateRepository = () => ({
    find: jest.fn().mockResolvedValue([]),
    save: jest
      .fn()
      .mockImplementation((entities: DeepPartial<Candidate>[]) =>
        Promise.resolve(entities.map(entity => Object.assign(new Candidate(), entity))),
      ),
    delete: jest.fn().mockResolvedValue({ affected: 1 }),
  });

  const mockVoteRepository = () => ({
    find: jest.fn(),
    findAndCount: jest.fn(),
  });

  const mockVoterRepository = () => ({
    findOne: jest.fn(),
    find: jest.fn(),
  });

  const mockUserRepository = () => ({
    findOne: jest.fn(),
  });

  // Mock ElectionStatusUpdaterService
  const mockElectionStatusUpdaterService = {
    scheduleElectionUpdates: jest.fn().mockResolvedValue(undefined),
  };

  const mockEmailService = {
    sendVotingLinkMail: jest.fn().mockResolvedValue(undefined),
    sendElectionCreationEmail: jest.fn().mockResolvedValue(undefined),
  };

  const mockVoterService = {
    getVotersByElection: jest.fn().mockResolvedValue({}),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ElectionService,
        { provide: getRepositoryToken(Election), useFactory: mockElectionRepository },
        { provide: getRepositoryToken(Candidate), useFactory: mockCandidateRepository },
        { provide: getRepositoryToken(Vote), useFactory: mockVoteRepository },
        { provide: getRepositoryToken(Voter), useFactory: mockVoterRepository },
        { provide: getRepositoryToken(User), useFactory: mockUserRepository },
        { provide: ElectionStatusUpdaterService, useValue: mockElectionStatusUpdaterService },
        { provide: EmailService, useValue: mockEmailService },
        { provide: VoterService, useValue: mockVoterService },
      ],
    }).compile();

    service = module.get<ElectionService>(ElectionService);
    electionRepository = module.get<Repository<Election>>(getRepositoryToken(Election));
    candidateRepository = module.get<Repository<Candidate>>(getRepositoryToken(Candidate));
    voteRepository = module.get<Repository<Vote>>(getRepositoryToken(Vote));
    voterRepository = module.get<Repository<Voter>>(getRepositoryToken(Voter));
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    emailService = module.get<EmailService>(EmailService);
    voterService = module.get<VoterService>(VoterService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new election with valid data', async () => {
      const createElectionDto: CreateElectionDto = {
        title: '2025 Presidential Election',
        description: 'Election to choose the next president of the country',
        start_date: new Date('2025-03-22T00:00:00.000Z'),
        end_date: new Date('2025-03-22T00:00:00.000Z'),
        start_time: '09:00:00',
        end_time: '10:00:00',
        election_type: ElectionType.SINGLECHOICE,
        max_choices: 1,
        candidates: [
          { name: 'Tommy', photo_url: 'https://tommy.com', bio: 'Tommy is a great leader' },
          { name: 'Ben', photo_url: 'https://ben.com', bio: 'Ben is a strong candidate' },
        ],
      };
      const mockUser = { id: 'f14acef6-abf1-41fc-aca5-0cf932db657e', email: 'admin@example.com', plan: 'FREE' };
      userRepository.findOne = jest.fn().mockResolvedValue(mockUser);
      electionRepository.count = jest.fn().mockResolvedValue(0);
      electionRepository.create = jest.fn().mockReturnValue({});
      electionRepository.save = jest.fn().mockResolvedValue({
        id: '550e8400-e29b-41d4-a716-446655440000',
        ...createElectionDto,
        created_by: mockUser.id,
      });

      const result = await service.create(createElectionDto, mockUser.id);

      expect(result).toEqual({
        status_code: 201,
        message: 'Election creation successful',
        data: expect.objectContaining({
          election_id: '550e8400-e29b-41d4-a716-446655440000',
        }),
      });
    });
  });

  describe('Get all elections', () => {
    it('should return all elections', async () => {
      const userId = '3ee3ee33-0f22-41bf-b5d1-2be27e085bbd';
      const user = { id: userId } as User;
      const elections: Election[] = [
        {
          id: '550e8400-e29b-41d4-a716-446655440000',
          title: '2023 Presidential Election',
          description: 'Election to choose the next president of the country',
          start_date: new Date('2025-10-22T00:00:00.000Z'),
          end_date: new Date('2025-10-31T23:59:59.000Z'),
          start_time: '09:00:00',
          end_time: '10:00:00',
          status: ElectionStatus.UPCOMING,
          created_at: new Date(),
          created_by: userId,
          created_by_user: user,
          vote_id: '7284fdbc-a1b9-45ad-a586-72edae14526d',
          updated_at: new Date(),
          deleted_at: null,
          candidates: [] as Candidate[],
          votes: [] as Vote[],
          voters: [],
          max_choices: 1,
          type: ElectionType.SINGLECHOICE,
          email_notification: false,
        },
        {
          id: '550e8400-e29b-41d4-a716-446655440001',
          title: '2023 Parliamentary Election',
          description: 'Election to choose members of parliament',
          start_date: new Date('2025-11-21T00:00:00.000Z'),
          end_date: new Date('2025-11-30T23:59:59.000Z'),
          start_time: '09:00:00',
          end_time: '10:00:00',
          status: ElectionStatus.UPCOMING,
          created_by: userId,
          deleted_at: null,
          updated_at: new Date(),
          vote_id: 'ad658c1c-ffca-4640-bfd4-ac8aece2eabf',
          created_by_user: user,
          created_at: new Date(),
          candidates: [] as Candidate[],
          votes: [] as Vote[],
          voters: [],
          max_choices: 1,
          type: ElectionType.SINGLECHOICE,
          email_notification: false,
        },
      ];

      const total = 2;
      const page = 1;
      const pageSize = 10;

      jest.spyOn(electionRepository, 'findAndCount').mockResolvedValue([elections, total]);

      const result = await service.findAll(page, pageSize, 'ad658c1c-ffca-4640-bfd4-ac8aece2eabf');

      expect(result).toEqual({
        status_code: 200,
        message: 'Elections fetched successfully',
        data: {
          current_page: page,
          total_pages: 1,
          total_results: total,
          elections: [
            {
              election_id: '550e8400-e29b-41d4-a716-446655440000',
              title: '2023 Presidential Election',
              start_date: new Date('2025-10-22T00:00:00.000Z'),
              end_date: new Date('2025-10-31T23:59:59.000Z'),
              start_time: '09:00:00',
              vote_id: '7284fdbc-a1b9-45ad-a586-72edae14526d',
              status: ElectionStatus.UPCOMING,
              end_time: '10:00:00',
              created_by: userId,
              max_choices: 1,
              election_type: ElectionType.SINGLECHOICE,
              candidates: [],
              vote_count: 0,
            },
            {
              election_id: '550e8400-e29b-41d4-a716-446655440001',
              title: '2023 Parliamentary Election',
              start_date: new Date('2025-11-21T00:00:00.000Z'),
              end_date: new Date('2025-11-30T23:59:59.000Z'),
              start_time: '09:00:00',
              end_time: '10:00:00',
              status: ElectionStatus.UPCOMING,
              vote_id: 'ad658c1c-ffca-4640-bfd4-ac8aece2eabf',
              created_by: userId,
              max_choices: 1,
              election_type: ElectionType.SINGLECHOICE,
              candidates: [],
              vote_count: 0,
            },
          ],
          meta: {
            hasNext: false,
            total,
            nextPage: null,
            prevPage: null,
          },
        },
      });

      expect(electionRepository.findAndCount).toHaveBeenCalledWith({
        where: { created_by: 'ad658c1c-ffca-4640-bfd4-ac8aece2eabf' },
        skip: 0,
        take: pageSize,
        relations: ['created_by_user', 'candidates', 'votes'],
      });
    });

    it('should return an empty list if no elections exist', async () => {
      const page = 1;
      const pageSize = 10;

      jest.spyOn(electionRepository, 'findAndCount').mockResolvedValue([[], 0]);

      const result = await service.findAll(page, pageSize, 'ad658c1c-ffca-4640-bfd4-ac8aece2eabf');

      expect(result).toEqual({
        status_code: 200,
        message: 'Elections fetched successfully',
        data: {
          current_page: page,
          total_pages: 0,
          total_results: 0,
          elections: [],
          meta: {
            hasNext: false,
            total: 0,
            nextPage: null,
            prevPage: null,
          },
        },
      });

      expect(electionRepository.findAndCount).toHaveBeenCalledWith({
        skip: 0,
        take: pageSize,
        relations: ['created_by_user', 'candidates', 'votes'],
        where: { created_by: 'ad658c1c-ffca-4640-bfd4-ac8aece2eabf' },
      });
    });

    it('should handle database errors gracefully', async () => {
      const page = 1;
      const pageSize = 10;

      jest.spyOn(electionRepository, 'findAndCount').mockRejectedValue(new Error('Database connection failed'));

      await expect(service.findAll(page, pageSize, 'ad658c1c-ffca-4640-bfd4-ac8aece2eabf')).rejects.toThrow(
        'Database connection failed',
      );

      expect(electionRepository.findAndCount).toHaveBeenCalledWith({
        skip: 0,
        take: pageSize,
        relations: ['created_by_user', 'candidates', 'votes'],
        where: { created_by: 'ad658c1c-ffca-4640-bfd4-ac8aece2eabf' },
      });
    });

    it('should throw an error if pagination parameters are invalid', async () => {
      const page = 0;
      const pageSize = -10;

      await expect(service.findAll(page, pageSize, 'ad658c1c-ffca-4640-bfd4-ac8aece2eabf')).rejects.toThrow(
        'Invalid pagination parameters. Page and pageSize must be greater than 0.',
      );
    });
  });

  describe('findOne', () => {
    it('should return an election with votes and candidates', async () => {
      const electionId = '123';
      const mockElection = {
        id: electionId,
        created_at: new Date('2025-03-22T13:35:13.731Z'),
        updated_at: new Date('2025-03-30T13:35:13.731Z'),
        deleted_at: null,
        status: ElectionStatus.ONGOING,
        title: '2025 Presidential Election',
        description: 'Election to choose the next president of the country',
        start_date: new Date('2025-03-01T00:00:00.000Z'),
        end_date: new Date('2025-03-31T23:59:59.999Z'),
        start_time: '09:00:00',
        end_time: '10:00:00',
        type: 'singlechoice',
        created_by: 'ad658c1c-ffca-4640-bfd4-ac8aece2eabf',
        candidates: [],
      };

      const mockCandidates = [
        { id: 'c1', name: 'Candidate A', election_id: electionId },
        { id: 'c2', name: 'Candidate B', election_id: electionId },
      ];

      const mockVotes = [
        { candidate_id: 'c1', election_id: electionId },
        { candidate_id: 'c1', election_id: electionId },
        { candidate_id: 'c2', election_id: electionId },
      ];

      // Mock repository methods
      electionRepository.findOne = jest.fn().mockResolvedValue(mockElection);
      candidateRepository.find = jest.fn().mockResolvedValue(mockCandidates);
      voteRepository.find = jest.fn().mockResolvedValue(mockVotes);

      const result = await service.findOne(electionId);
      expect(result).toEqual({
        status_code: 200,
        message: 'Election fetched successfully',
        data: {
          election: {
            election_id: electionId,
            title: '2025 Presidential Election',
            description: 'Election to choose the next president of the country',
            votes_casted: 3,
            start_date: new Date('2025-03-01T00:00:00.000Z'),
            start_time: '09:00:00',
            end_date: new Date('2025-03-31T23:59:59.999Z'),
            end_time: '10:00:00',
            status: 'ongoing',
            vote_id: undefined,
            candidates: [
              { candidate_id: 'c1', name: 'Candidate A', vote_count: 2 },
              { candidate_id: 'c2', name: 'Candidate B', vote_count: 1 },
            ],
          },
        },
      });
    });

    it('should throw NotFoundException if election does not exist', async () => {
      electionRepository.findOne = jest.fn().mockResolvedValue(null);
      const electionId = '123';
      await expect(service.findOne(electionId)).rejects.toThrow(
        new NotFoundException({
          status_code: HttpStatus.NOT_FOUND,
          message: SYS_MSG.ELECTION_NOT_FOUND,
          data: null,
        }),
      );
    });
  });

  describe('remove', () => {
    const electionId = '550e8400-e29b-41d4-a716-446655440000';
    const adminId = 'ad658c1c-ffca-4640-bfd4-ac8aece2eabf';

    it('should throw NotFoundException if election does not exist', async () => {
      jest.spyOn(electionRepository, 'findOne').mockResolvedValue(null);

      await expect(service.remove(electionId, adminId)).rejects.toThrow(NotFoundException);
      expect(electionRepository.findOne).toHaveBeenCalledWith({
        where: { id: electionId },
        relations: ['candidates'],
      });
    });

    it('should throw ForbiddenException if adminId does not match election creator', async () => {
      const differentAdminId = 'f14acef6-abf1-41fc-aca5-0cf932db657f';
      jest.spyOn(electionRepository, 'findOne').mockResolvedValue({
        id: electionId,
        created_by: differentAdminId,
      } as Election);

      await expect(service.remove(electionId, adminId)).rejects.toThrow(ForbiddenException);
      expect(electionRepository.findOne).toHaveBeenCalledWith({
        where: { id: electionId },
        relations: ['candidates'],
      });
    });

    it('should throw ForbiddenException if election is ongoing', async () => {
      jest.spyOn(electionRepository, 'findOne').mockResolvedValue({
        id: electionId,
      } as Election);

      await expect(service.remove(electionId, adminId)).rejects.toThrow(ForbiddenException);
      expect(electionRepository.findOne).toHaveBeenCalledWith({
        where: { id: electionId },
        relations: ['candidates'],
      });
    });

    it('should delete election if it exists and is not ongoing', async () => {
      const completedElection = {
        id: electionId,
        created_by: adminId,
      };

      jest.spyOn(electionRepository, 'findOne').mockResolvedValue(completedElection as Election);
      jest.spyOn(electionRepository, 'delete').mockResolvedValue({ affected: 1 } as any);

      const result = await service.remove(electionId, adminId);

      expect(electionRepository.findOne).toHaveBeenCalledWith({
        where: { id: electionId },
        relations: ['candidates'],
      });
      expect(electionRepository.delete).toHaveBeenCalledWith({ id: electionId });

      expect(result).toEqual({
        status_code: HttpStatus.OK,
        message: SYS_MSG.ELECTION_DELETED,
        data: null,
      });
    });

    it('should throw InternalServerErrorException if deletion fails', async () => {
      jest.spyOn(electionRepository, 'findOne').mockResolvedValue({
        id: electionId,
        created_by: adminId,
      } as Election);

      jest.spyOn(electionRepository, 'delete').mockRejectedValue(new Error('Delete error'));

      await expect(service.remove(electionId, adminId)).rejects.toThrow(InternalServerErrorException);
      expect(electionRepository.findOne).toHaveBeenCalledWith({
        where: { id: electionId },
        relations: ['candidates'],
      });
      expect(electionRepository.delete).toHaveBeenCalledWith({ id: electionId });
    });
  });

  describe('getElectionByVoterLink', () => {
    const validVoteToken = 'valid-vote-token';

    beforeEach(() => {
      (service as any).transformElectionResponse = jest.fn(election => ({ ...election }));
    });

    it('should throw NotFoundException if voter is not found', async () => {
      (voterRepository.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.getElectionByVoterLink(validVoteToken)).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if voter has already voted', async () => {
      (voterRepository.findOne as jest.Mock).mockResolvedValue({
        is_voted: true,
        verification_token: validVoteToken,
        election: {},
      });

      await expect(service.getElectionByVoterLink(validVoteToken)).rejects.toThrow(ForbiddenException);
    });

    describe('when voter is valid', () => {
      let voter: any;

      beforeEach(() => {
        voter = {
          is_voted: false,
          verification_token: validVoteToken,
          election: {
            id: 'election-id-1',
            start_date: new Date('2025-03-20T12:00:00Z'),
            end_date: new Date('2025-03-20T16:00:00Z'),
            start_time: '12:00:00',
            end_time: '16:00:00',
            status: ElectionStatus.UPCOMING,
            candidates: [],
            vote_id: 'dummy-vote-id',
          },
        };
        (voterRepository.findOne as jest.Mock).mockResolvedValue(voter);
      });

      it('should return UPCOMING status if election has not started yet', async () => {
        const fakeNow = new Date('2025-03-20T08:00:00Z');
        jest.useFakeTimers().setSystemTime(fakeNow);

        voter.election.status = ElectionStatus.ONGOING;

        const result = await service.getElectionByVoterLink(validVoteToken);

        expect(electionRepository.update).toHaveBeenCalledWith(voter.election.id, { status: ElectionStatus.UPCOMING });
        expect(result).toEqual({
          status_code: HttpStatus.OK,
          message: SYS_MSG.ELECTION_HAS_NOT_STARTED,
          data: { ...voter.election, vote_id: validVoteToken },
        });
        jest.useRealTimers();
      });

      it('should return ONGOING status if election is live', async () => {
        const fakeNow = new Date('2025-03-20T12:30:00Z');
        jest.useFakeTimers().setSystemTime(fakeNow);
        voter.election.status = ElectionStatus.UPCOMING;

        const result = await service.getElectionByVoterLink(validVoteToken);

        expect(electionRepository.update).toHaveBeenCalledWith(voter.election.id, { status: ElectionStatus.ONGOING });
        expect(result).toEqual({
          status_code: HttpStatus.OK,
          message: SYS_MSG.ELECTION_IS_LIVE,
          data: { ...voter.election, vote_id: validVoteToken },
        });
        jest.useRealTimers();
      });

      it('should return COMPLETED status if election has ended', async () => {
        const fakeNow = new Date('2025-03-20T16:00:00Z');
        jest.useFakeTimers().setSystemTime(fakeNow);
        voter.election.status = ElectionStatus.ONGOING;

        const result = await service.getElectionByVoterLink(validVoteToken);

        expect(electionRepository.update).toHaveBeenCalledWith(voter.election.id, { status: ElectionStatus.COMPLETED });
        expect(result).toEqual({
          status_code: HttpStatus.OK,
          message: SYS_MSG.ELECTION_HAS_ENDED,
          data: { ...voter.election, vote_id: validVoteToken },
        });
        jest.useRealTimers();
      });
    });
  });

  describe('verify voter', () => {
    const mockElection = {
      status: ElectionStatus.COMPLETED,
      id: 'election_id',
      vote_id: 'vote_id',
      voters: [
        { id: 'candidate-1', email: 'user@example.com' },
        { id: 'candidate-2', email: 'test@example.com' },
      ],
    } as Election;

    const verifyVoteDto = {
      vote_id: 'vote_id',
      email: 'user@example.com',
    };
    it('should throw NotFoundException if election does not exist', async () => {
      jest.spyOn(electionRepository, 'findOne').mockResolvedValue(null);
      await expect(service.verifyVoter(verifyVoteDto)).rejects.toThrow(
        new HttpException(
          { status_code: HttpStatus.NOT_FOUND, message: SYS_MSG.ELECTION_NOT_FOUND, data: null },
          HttpStatus.NOT_FOUND,
        ),
      );
      expect(electionRepository.findOne).toHaveBeenCalledWith({
        where: { vote_id: verifyVoteDto.vote_id },
        relations: ['voters'],
      });
    });
    it('should throw UnauthorizedException if voter is not found in email list', async () => {
      const verifyVoteDto = {
        vote_id: 'vote_id',
        email: 'voter@example.com',
      };
      jest.spyOn(electionRepository, 'findOne').mockResolvedValue(mockElection);
      await expect(service.verifyVoter(verifyVoteDto)).rejects.toThrow(
        new UnauthorizedException({
          status_code: HttpStatus.UNAUTHORIZED,
          message: SYS_MSG.VOTER_UNVERIFIED,
          data: null,
        }),
      );
      expect(electionRepository.findOne).toHaveBeenCalledWith({
        where: { vote_id: verifyVoteDto.vote_id },
        relations: ['voters'],
      });
    });
    it('should return Httpstatus.Ok if voter is found', async () => {
      jest.spyOn(electionRepository, 'findOne').mockResolvedValue(mockElection);
      await expect(service.verifyVoter(verifyVoteDto)).resolves.toEqual({
        status_code: HttpStatus.OK,
        message: SYS_MSG.VOTER_VERIFIED,
        data: null,
      });
      expect(electionRepository.findOne).toHaveBeenCalledWith({
        where: { vote_id: verifyVoteDto.vote_id },
        relations: ['voters'],
      });
    });
  });

  describe('sendVotingLinkToVoters', () => {
    it('should throw an error if the id is not a valid UUID', async () => {
      await expect(service.sendVotingLinkToVoters('invalid-uuid')).rejects.toThrow(HttpException);
    });

    it('should throw an error if the election is not found', async () => {
      jest.spyOn(electionRepository, 'findOne').mockResolvedValue(null);

      await expect(service.sendVotingLinkToVoters('550e8400-e29b-41d4-a716-446655440000')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return a message if email notifications are disabled', async () => {
      const election = { id: '550e8400-e29b-41d4-a716-446655440000', email_notification: false } as Election;
      jest.spyOn(electionRepository, 'findOne').mockResolvedValue(election);

      const result = await service.sendVotingLinkToVoters('550e8400-e29b-41d4-a716-446655440000');

      expect(result).toEqual({
        status_code: 200,
        message: SYS_MSG.EMAIL_NOTIFICATION_DISABLED,
        data: null,
      });
    });

    it('should return a message if no voters are found', async () => {
      const election = { id: '550e8400-e29b-41d4-a716-446655440000', email_notification: true } as Election;
      jest.spyOn(electionRepository, 'findOne').mockResolvedValue(election);
      jest.spyOn(voterService, 'getVotersByElection').mockResolvedValue([]);

      const result = await service.sendVotingLinkToVoters('550e8400-e29b-41d4-a716-446655440000');

      expect(result).toEqual({
        status_code: 204,
        message: SYS_MSG.ELECTION_VOTERS_NOT_FOUND,
        data: null,
      });
    });

    it('should send voting links to all voters successfully', async () => {
      const election = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        email_notification: true,
        start_date: new Date('2025-03-19T10:13:13.473Z'),
        start_time: '09:00:00',
        end_date: new Date('2025-03-19T10:13:13.473Z'),
        end_time: '17:00:00',
        title: '2025 Presidential Election',
      } as Election;

      const voters = [
        { name: 'Voter One', email: 'voter1@example.com', verification_token: 'token1' },
        { name: 'Voter Two', email: 'voter2@example.com', verification_token: 'token2' },
      ] as Voter[];

      jest.spyOn(electionRepository, 'findOne').mockResolvedValue(election);
      jest.spyOn(voterService, 'getVotersByElection').mockResolvedValue(voters);
      jest.spyOn(emailService, 'sendVotingLinkMail').mockResolvedValue({} as any);

      const result = await service.sendVotingLinkToVoters('550e8400-e29b-41d4-a716-446655440000');

      expect(emailService.sendVotingLinkMail).toHaveBeenCalledTimes(voters.length);
      expect(emailService.sendVotingLinkMail).toHaveBeenCalledWith(
        'voter1@example.com',
        'Voter One',
        '2025 Presidential Election',
        'March 19th 2025',
        '9:00 AM',
        'March 19th 2025',
        '5:00 PM',
        'token1',
      );
      expect(emailService.sendVotingLinkMail).toHaveBeenCalledWith(
        'voter2@example.com',
        'Voter Two',
        '2025 Presidential Election',
        'March 19th 2025',
        '9:00 AM',
        'March 19th 2025',
        '5:00 PM',
        'token2',
      );
      expect(result).toEqual({
        status_code: HttpStatus.OK,
        message: SYS_MSG.VOTING_LINK_SENT_SUCCESSFULLY,
        data: null,
      });
    });
  });
});
