import {
  ForbiddenException,
  HttpException,
  HttpStatus,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DeepPartial, Repository } from 'typeorm';
import * as SYS_MSG from '../../../shared/constants/systemMessages';
import { Candidate } from '../../candidate/entities/candidate.entity';
import { User } from '../../user/entities/user.entity';
import { Vote } from '../../votes/entities/votes.entity';
import { CreateElectionDto } from '../dto/create-election.dto';
import { ElectionService } from '../election.service';
import { Election, ElectionStatus, ElectionType } from '../entities/election.entity';
import { ElectionStatusUpdaterService } from '../../../schedule-tasks/election-status-updater.service';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';

describe('ElectionService', () => {
  let service: ElectionService;
  let electionRepository: Repository<Election>;
  let candidateRepository: Repository<Candidate>;
  let voteRepository: Repository<Vote>;

  // Mock repositories
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
  });

  // Mock ElectionStatusUpdaterService
  const mockElectionStatusUpdaterService = {
    scheduleElectionUpdates: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ElectionService,
        { provide: getRepositoryToken(Election), useFactory: mockElectionRepository },
        { provide: getRepositoryToken(Candidate), useFactory: mockCandidateRepository },
        { provide: getRepositoryToken(Vote), useFactory: mockVoteRepository },
        { provide: ElectionStatusUpdaterService, useValue: mockElectionStatusUpdaterService }, // Provide the mock service
      ],
    }).compile();

    service = module.get<ElectionService>(ElectionService);
    electionRepository = module.get<Repository<Election>>(getRepositoryToken(Election));
    candidateRepository = module.get<Repository<Candidate>>(getRepositoryToken(Candidate));
    voteRepository = module.get<Repository<Vote>>(getRepositoryToken(Vote));
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
        candidates: ['Candidate A', 'Candidate B'],
      };

      const result = await service.create(createElectionDto, 'f14acef6-abf1-41fc-aca5-0cf932db657e');

      expect(result).toEqual({
        status_code: 201,
        message: 'Election creation successful',
        data: {
          election_id: '550e8400-e29b-41d4-a716-446655440000',
          title: createElectionDto.title,
          description: createElectionDto.description,
          start_date: createElectionDto.start_date,
          end_date: createElectionDto.end_date,
          start_time: createElectionDto.start_time,
          vote_id: expect.any(String),
          end_time: createElectionDto.end_time,
          election_type: ElectionType.SINGLECHOICE,
          created_by: 'f14acef6-abf1-41fc-aca5-0cf932db657e',
          candidates: createElectionDto.candidates,
        },
      });

      expect(electionRepository.create).toHaveBeenCalledWith({
        title: createElectionDto.title,
        description: createElectionDto.description,
        start_date: createElectionDto.start_date,
        end_date: createElectionDto.end_date,
        start_time: createElectionDto.start_time,
        vote_id: expect.any(String),
        end_time: createElectionDto.end_time,
        type: createElectionDto.election_type,
        created_by: 'f14acef6-abf1-41fc-aca5-0cf932db657e',
      });

      expect(electionRepository.save).toHaveBeenCalled();
      expect(candidateRepository.save).toHaveBeenCalled();
      expect(mockElectionStatusUpdaterService.scheduleElectionUpdates);
    });

    it('should handle errors during election creation', async () => {
      const createElectionDto: CreateElectionDto = {
        title: '2025 Presidential Election',
        description: 'Election to choose the next president of the country',
        start_date: new Date('2025-03-21T00:00:00.000Z'),
        end_date: new Date('2025-03-22T00:00:00.000Z'),
        start_time: '09:00:00',
        end_time: '10:00:00',
        // vote_link: '7284fdbc-a1b9-45ad-a586-72edae14526d',
        election_type: ElectionType.SINGLECHOICE,
        candidates: ['Candidate A', 'Candidate B'],
      };

      jest.spyOn(electionRepository, 'create').mockImplementationOnce(() => {
        throw new Error('Error creating election');
      });

      await expect(service.create(createElectionDto, 'f14acef6-abf1-41fc-aca5-0cf932db657e')).rejects.toThrow(
        'Error creating election',
      );
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
          max_choices: 1,
          type: ElectionType.SINGLECHOICE,
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
          max_choices: 1,
          type: ElectionType.SINGLECHOICE,
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
    // it('should return an election with votes and candidates', async () => {
    //   const electionId = '123';
    //   const mockElection = {
    //     id: electionId,
    //     created_at: new Date('2025-03-22T13:35:13.731Z'),
    //     updated_at: new Date('2025-03-30T13:35:13.731Z'),
    //     deleted_at: null,
    //     status: ElectionStatus.UPCOMING,
    //     title: '2025 Presidential Election',
    //     description: 'Election to choose the next president of the country',
    //     start_date: new Date('2025-03-01T00:00:00.000Z'),
    //     end_date: new Date('2025-03-31T23:59:59.999Z'),
    //     start_time: '09:00:00',
    //     end_time: '10:00:00',
    //     type: 'singlechoice',
    //     created_by: 'ad658c1c-ffca-4640-bfd4-ac8aece2eabf',
    //   };

    //   const mockCandidates = [
    //     { id: 'c1', name: 'Candidate A', election_id: electionId },
    //     { id: 'c2', name: 'Candidate B', election_id: electionId },
    //   ];

    //   const mockVotes = [
    //     { candidate_id: 'c1', election_id: electionId },
    //     { candidate_id: 'c1', election_id: electionId },
    //     { candidate_id: 'c2', election_id: electionId },
    //   ];

    //   // Mock repository methods
    //   electionRepository.findOne = jest.fn().mockResolvedValue(mockElection);
    //   candidateRepository.find = jest.fn().mockResolvedValue(mockCandidates);
    //   voteRepository.find = jest.fn().mockResolvedValue(mockVotes);

    //   const result = await service.findOne(electionId);
    //   expect(result).toEqual({
    //     status_code: 200,
    //     message: 'Election fetched successfully',
    //     data: {
    //       election: {
    //         election_id: electionId,
    //         title: '2025 Presidential Election',
    //         description: 'Election to choose the next president of the country',
    //         votes_casted: 3,
    //         start_date: new Date('2025-03-01T00:00:00.000Z'),
    //         start_time: '09:00:00',
    //         end_date: new Date('2025-03-31T23:59:59.999Z'),
    //         end_time: '10:00:00',
    //         candidates: [
    //           { candidate_id: 'c1', name: 'Candidate A', vote_count: 2 },
    //           { candidate_id: 'c2', name: 'Candidate B', vote_count: 1 },
    //         ],
    //       },
    //     },
    //   });
    // });

    it('should throw NotFoundException if election does not exist', async () => {
      electionRepository.findOne = jest.fn().mockResolvedValue(null);
      const electionId = '123';
      const adminId = await expect(service.findOne(electionId)).rejects.toThrow(
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

    // TODO
    // it('should throw ForbiddenException if election is ongoing', async () => {
    //   jest.spyOn(electionRepository, 'findOne').mockResolvedValue({
    //     id: electionId,
    //   } as Election);

    //   await expect(service.remove(electionId)).rejects.toThrow(ForbiddenException);
    //   expect(electionRepository.findOne).toHaveBeenCalledWith({
    //     where: { id: electionId },
    //     relations: ['candidates'],
    //   });
    // });

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

  describe('Get Election By Vote Link', () => {
    const validVoteLink = '7284fdbc-a1b9-45ad-a586-72edae14526d';
    const invalidVoteLink = 'invalid-vote-link';

    it('should throw a HttpException with 400 status when the vote_id is not a valid UUID', async () => {
      await expect(service.getElectionByVoterLink(invalidVoteLink)).rejects.toThrow(
        new HttpException(
          { status_code: HttpStatus.BAD_REQUEST, message: SYS_MSG.INCORRECT_UUID, data: null },
          HttpStatus.BAD_REQUEST,
        ),
      );
      expect(electionRepository.findOne).not.toHaveBeenCalled();
    });

    // it('should return the election when a valid vote_id is provided and the election exists', async () => {
    //   const mockElection = {
    //     id: '550e8400-e29b-41d4-a716-446655440000',
    //     title: '2025 Presidential Election',
    //     description: 'Election to choose the next president of the country',
    //     start_date: new Date('2025-03-01T00:00:00.000Z'),
    //     end_date: new Date('2025-03-31T23:59:59.999Z'),
    //     start_time: '09:00:00',
    //     status: ElectionStatus.ONGOING,
    //     end_time: '10:00:00',
    //     created_by: 'f14acef6-abf1-41fc-aca5-0cf932db657e',
    //     candidates: [],
    //     created_by_user: {} as User,
    //     votes: [] as Vote[],
    //     created_at: new Date(),
    //     updated_at: new Date(),
    //     deleted_at: null,
    //     type: ElectionType.SINGLECHOICE,
    //     max_choices: 1,
    //     vote_id: validVoteLink,
    //   };

    //   // Mock Date.now() to ensure test consistency
    //   const mockNow = new Date('2025-03-15T09:30:00.000Z'); // Middle of the election period
    //   jest.spyOn(Date, 'now').mockImplementation(() => mockNow.getTime());

    //   jest.spyOn(electionRepository, 'findOne').mockResolvedValue(mockElection as unknown as Election);

    //   const result = await service.getElectionByVoterLink(validVoteLink);

    //   expect(result).toEqual({
    //     status_code: HttpStatus.OK,
    //     message: "Election has not started!",
    //     data: {
    //       election_id: mockElection.id,
    //       title: mockElection.title,
    //       description: mockElection.description,
    //       start_date: mockElection.start_date,
    //       end_date: mockElection.end_date,
    //       vote_id: undefined,
    //       status: "upcoming",
    //       start_time: mockElection.start_time,
    //       end_time: mockElection.end_time,
    //       created_by: mockElection.created_by,
    //       candidates: [],
    //       max_choices: 1,
    //       election_type: ElectionType.SINGLECHOICE,
    //     },
    //   });

    //   expect(electionRepository.findOne).toHaveBeenCalledWith({
    //     where: { vote_id: validVoteLink },
    //     relations: ['candidates'],
    //   });

    //   // Restore Date
    //   jest.spyOn(Date, 'now').mockRestore();
    // });

    it('should throw a HttpException with 400 status when the vote_id is not a valid UUID', async () => {
      await expect(service.getElectionByVoterLink(invalidVoteLink)).rejects.toThrow(
        new HttpException(
          { status_code: HttpStatus.BAD_REQUEST, message: SYS_MSG.INCORRECT_UUID, data: null },
          HttpStatus.BAD_REQUEST,
        ),
      );
      expect(electionRepository.findOne).not.toHaveBeenCalled();
    });

    // it('should throw a ForbiddenException with 403 status when the election status is pending', async () => {
    //   jest.spyOn(electionRepository, 'findOne').mockResolvedValue({
    //     vote_id: validVoteLink,
    //     status: ElectionStatus.UPCOMING,
    //   } as Election);

    //   await expect(service.getElectionByVoterLink(validVoteLink)).rejects.toThrow(
    //     new ForbiddenException({
    //       status_code: HttpStatus.FORBIDDEN,
    //       message: SYS_MSG.ELECTION_HAS_NOT_STARTED,
    //       data: null,
    //     }),
    //   );

    //   expect(electionRepository.findOne).toHaveBeenCalledWith({
    //     where: { vote_id: validVoteLink },
    //     relations: ['candidates'],
    //   });
    // });

    // it('should throw a NotFoundException with 404 status when the election status is completed', async () => {
    //   jest.spyOn(electionRepository, 'findOne').mockResolvedValue({
    //     vote_id: validVoteLink,
    //     status: ElectionStatus.COMPLETED,
    //   } as Election);

    //   await expect(service.getElectionByVoterLink(validVoteLink)).rejects.toThrow(
    //     new NotFoundException({
    //       status_code: HttpStatus.NOT_FOUND,
    //       message: SYS_MSG.ELECTION_HAS_ENDED,
    //       data: null,
    //     }),
    //   );

    //   expect(electionRepository.findOne).toHaveBeenCalledWith({
    //     where: { vote_id: validVoteLink },
    //     relations: ['candidates'],
    //   });
    // });

    it('should throw a NotFoundException when the election with the provided vote_link does not exist', async () => {
      jest.spyOn(electionRepository, 'findOne').mockResolvedValue(null);

      await expect(service.getElectionByVoterLink(validVoteLink)).rejects.toThrow(
        new NotFoundException({
          status_code: HttpStatus.NOT_FOUND,
          message: SYS_MSG.ELECTION_NOT_FOUND,
          data: null,
        }),
      );

      expect(electionRepository.findOne).toHaveBeenCalledWith({
        where: { vote_id: validVoteLink },
        relations: ['candidates'],
      });
    });

    //   it('should throw a HttpException with 403 status when the election is completed and voting is no longer allowed', async () => {
    //     const completedElection = {
    //       id: '550e8400-e29b-41d4-a716-446655440000',
    //       title: '2025 Presidential Election',
    //       description: 'Election to choose the next president of the country',
    //       start_date: new Date('2025-03-01T00:00:00.000Z'),
    //       end_date: new Date('2025-03-31T23:59:59.999Z'),
    //       start_time: '09:00:00',
    //       end_time: '10:00:00',
    //       type: ElectionType.SINGLECHOICE,
    //       created_by: 'f14acef6-abf1-41fc-aca5-0cf932db657e',
    //       vote_link: validVoteLink,
    //     };

    //     jest.spyOn(electionRepository, 'findOne').mockResolvedValue(completedElection as Election);

    //     await expect(service.getElectionByVoterLink(validVoteLink)).rejects.toThrow(
    //       new HttpException(
    //         { status_code: HttpStatus.FORBIDDEN, message: SYS_MSG.ELECTION_ENDED_VOTE_NOT_ALLOWED, data: null },
    //         HttpStatus.FORBIDDEN,
    //       ),
    //     );

    //     expect(electionRepository.findOne).toHaveBeenCalledWith({
    //       where: { vote_link: validVoteLink },
    //       relations: ['candidates'],
    //     });
    //   });
    // });
  });

  describe('getElectionResults', () => {
    const electionId = '550e8400-e29b-41d4-a716-446655440000';
    const adminId = 'f14acef6-abf1-41fc-aca5-0cf932db657e';
    const mockElection = {
      id: electionId,
      title: '2025 Presidential Election',
      created_by: adminId,
      candidates: [
        { id: 'candidate-1', name: 'Candidate A' },
        { id: 'candidate-2', name: 'Candidate B' },
      ],
      votes: [{ candidate_id: ['candidate-1'] }, { candidate_id: ['candidate-1'] }, { candidate_id: ['candidate-2'] }],
    } as Election;

    it('should throw HttpException if electionId is invalid', async () => {
      await expect(service.getElectionResults('invalid-id', adminId)).rejects.toThrow(
        new HttpException(
          { status_code: HttpStatus.BAD_REQUEST, message: SYS_MSG.INCORRECT_UUID, data: null },
          HttpStatus.BAD_REQUEST,
        ),
      );
    });

    it('should throw HttpException if adminId is invalid', async () => {
      await expect(service.getElectionResults(electionId, 'invalid-admin')).rejects.toThrow(
        new HttpException(
          { status_code: HttpStatus.BAD_REQUEST, message: SYS_MSG.INCORRECT_UUID, data: null },
          HttpStatus.BAD_REQUEST,
        ),
      );
    });

    it('should throw NotFoundException if election does not exist', async () => {
      jest.spyOn(electionRepository, 'findOne').mockResolvedValue(null);
      await expect(service.getElectionResults(electionId, adminId)).rejects.toThrow(
        new NotFoundException({
          status_code: HttpStatus.NOT_FOUND,
          message: SYS_MSG.ELECTION_NOT_FOUND,
          data: null,
        }),
      );
    });

    it('should throw ForbiddenException if adminId does not match election creator', async () => {
      const differentAdminId = 'different-admin-id';
      jest.spyOn(electionRepository, 'findOne').mockResolvedValue({
        ...mockElection,
        created_by: differentAdminId,
      } as Election);
      await expect(service.getElectionResults(electionId, adminId)).rejects.toThrow(
        new ForbiddenException({
          status_code: HttpStatus.FORBIDDEN,
          message: SYS_MSG.UNAUTHORIZED_ACCESS,
          data: null,
        }),
      );
    });
  });

  describe('getElectionResultsForDownload', () => {
    const electionId = '550e8400-e29b-41d4-a716-446655440000';
    const adminId = 'f14acef6-abf1-41fc-aca5-0cf932db657e';

    it('should generate CSV data with correct format', async () => {
      const mockResults = {
        data: {
          results: [
            { name: 'Candidate A', votes: 2 },
            { name: 'Candidate B', votes: 1 },
          ],
        },
      };

      jest.spyOn(service, 'getElectionResults').mockResolvedValue(mockResults as any);

      const result = await service.getElectionResultsForDownload(electionId, adminId);

      expect(result.csvData).toBe('Candidate Name,Votes\n' + '"Candidate A",2\n' + '"Candidate B",1');
      expect(result.filename).toBe(`election-${electionId}-results.csv`);
    });
  });

  describe('date and time validation', () => {
    let baseDto: CreateElectionDto;
    let adminId: string;

    beforeEach(() => {
      // Mock the current date to a fixed value
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2025-01-01T12:00:00Z'));

      baseDto = {
        title: '2025 Presidential Election',
        description: 'Election to choose the next president',
        start_date: new Date('2025-03-01T00:00:00.000Z'),
        end_date: new Date('2025-03-31T23:59:59.999Z'),
        start_time: '09:00:00',
        end_time: '17:00:00',
        election_type: ElectionType.SINGLECHOICE,
        candidates: ['Candidate A', 'Candidate B'],
      };

      adminId = 'f14acef6-abf1-41fc-aca5-0cf932db657e';
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should throw an exception when start date is in the past', async () => {
      const dto = {
        ...baseDto,
        start_date: new Date('2024-12-31T00:00:00.000Z'), // Past date
      };

      await expect(service.create(dto, adminId)).rejects.toThrow(
        new HttpException(
          { status_code: 400, message: SYS_MSG.ERROR_START_DATE_PAST, data: null },
          HttpStatus.BAD_REQUEST,
        ),
      );
    });

    it('should throw an exception when start date is after end date', async () => {
      const dto = {
        ...baseDto,
        start_date: new Date('2025-04-01T00:00:00.000Z'),
        end_date: new Date('2025-03-31T00:00:00.000Z'),
      };

      await expect(service.create(dto, adminId)).rejects.toThrow(
        new HttpException(
          { status_code: 400, message: SYS_MSG.ERROR_START_DATE_AFTER_END_DATE, data: null },
          HttpStatus.BAD_REQUEST,
        ),
      );
    });

    it('should throw an exception when start time is after end time on the same day', async () => {
      const dto = {
        ...baseDto,
        start_date: new Date('2025-03-22T00:00:00.000Z'),
        end_date: new Date('2025-03-22T00:00:00.000Z'),
        start_time: '15:00:00',
        end_time: '09:00:00',
      };

      await expect(service.create(dto, adminId)).rejects.toThrow(
        new HttpException(
          { status_code: 400, message: SYS_MSG.ERROR_START_TIME_AFTER_OR_EQUAL_END_TIME, data: null },
          HttpStatus.BAD_REQUEST,
        ),
      );
    });

    it('should accept when start time is before end time on the same day', async () => {
      const dto = {
        ...baseDto,
        start_date: new Date('2025-03-01T00:00:00.000Z'),
        end_date: new Date('2025-03-01T00:00:00.000Z'),
        start_time: '09:00:00',
        end_time: '17:00:00',
      };

      await expect(service.create(dto, adminId)).resolves.toBeDefined();
      expect(electionRepository.create).toHaveBeenCalled();
      expect(electionRepository.save).toHaveBeenCalled();
    });

    it('should accept when start time is after end time but on different days', async () => {
      const dto = {
        ...baseDto,
        start_date: new Date('2025-03-21T00:00:00.000Z'),
        end_date: new Date('2025-03-22T00:00:00.000Z'),
        start_time: '17:00:00',
        end_time: '09:00:00',
      };

      await expect(service.create(dto, adminId)).resolves.toBeDefined();
      expect(electionRepository.create).toHaveBeenCalled();
      expect(electionRepository.save).toHaveBeenCalled();
    });

    it('should throw an exception when title is a single character', async () => {
      const dto = plainToInstance(CreateElectionDto, {
        ...baseDto,
        title: 'A', // Single character
      });

      const validationErrors = await validate(dto);
      expect(validationErrors.length).toBeGreaterThan(0);
      expect(validationErrors[0].constraints?.minLength).toBe('Title must be at least 10 characters long');
    });

    it('should throw an exception when description is a single character', async () => {
      const dto = plainToInstance(CreateElectionDto, {
        ...baseDto,
        description: 'Short', // Single character
      });

      const validationErrors = await validate(dto);
      expect(validationErrors.length).toBeGreaterThan(0);
      expect(validationErrors[0].constraints?.minLength).toBe('Description must be at least 10 characters long');
    });
  });
});
