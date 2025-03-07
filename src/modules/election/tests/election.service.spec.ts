import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ElectionService } from '../election.service';
import { Election, ElectionStatus, ElectionType } from '../entities/election.entity';
import { User } from '../../user/entities/user.entity';
import { Candidate } from '../../candidate/entities/candidate.entity';
import { VoteLink } from '../../votelink/entities/votelink.entity';
import { Vote } from '../../votes/entities/votes.entity';
import { CreateElectionDto } from '../dto/create-election.dto';
import { ElectionResponseDto } from '../dto/election-response.dto';
import { DeepPartial } from 'typeorm';
import { ForbiddenException, InternalServerErrorException, NotFoundException } from '@nestjs/common';

describe('ElectionService', () => {
  let service: ElectionService;
  let electionRepository: Repository<Election>;
  let candidateRepository: Repository<Candidate>;
  let voteRepository: Repository<Vote>;

  const mockElectionRepository = () => ({
    findAndCount: jest.fn().mockResolvedValue([[], 0]),
    create: jest.fn().mockImplementation((data: Partial<Election>) => ({
      ...data,
      id: '550e8400-e29b-41d4-a716-446655440000',
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      created_by_user: {} as User,
      candidates: [] as Candidate[],
      votes: [] as Vote[],
      voter_links: [] as VoteLink[],
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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ElectionService,
        { provide: getRepositoryToken(Election), useFactory: mockElectionRepository },
        { provide: getRepositoryToken(Candidate), useFactory: mockCandidateRepository },
        { provide: getRepositoryToken(Vote), useFactory: mockVoteRepository },
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
        startDate: new Date('2025-03-01T00:00:00.000Z'),
        endDate: new Date('2025-03-31T23:59:59.999Z'),
        electionType: ElectionType.SINGLECHOICE,
        status: ElectionStatus.ONGOING,
        candidates: ['Candidate A', 'Candidate B'],
      };

      const result = await service.create(createElectionDto, 'admin123');

      expect(result).toEqual({
        election_id: '550e8400-e29b-41d4-a716-446655440000',
        election_title: createElectionDto.title,
        description: createElectionDto.description,
        start_date: createElectionDto.startDate,
        end_date: createElectionDto.endDate,
        election_type: ElectionType.SINGLECHOICE,
        created_by: 'admin123',
        candidates: createElectionDto.candidates,
      });

      expect(electionRepository.create).toHaveBeenCalledWith({
        title: createElectionDto.title,
        description: createElectionDto.description,
        start_date: createElectionDto.startDate,
        end_date: createElectionDto.endDate,
        status: ElectionStatus.ONGOING,
        type: createElectionDto.electionType,
        created_by: 'admin123',
      });

      expect(electionRepository.save).toHaveBeenCalled();
      expect(candidateRepository.save).toHaveBeenCalled();
    });

    it('should handle errors during election creation', async () => {
      const createElectionDto: CreateElectionDto = {
        title: '2025 Presidential Election',
        description: 'Election to choose the next president of the country',
        startDate: new Date('2025-03-01T00:00:00.000Z'),
        endDate: new Date('2025-03-31T23:59:59.999Z'),
        electionType: ElectionType.SINGLECHOICE,
        status: ElectionStatus.ONGOING,
        candidates: ['Candidate A', 'Candidate B'],
      };

      jest.spyOn(electionRepository, 'create').mockImplementationOnce(() => {
        throw new Error('Error creating election');
      });

      await expect(service.create(createElectionDto, 'admin123')).rejects.toThrow('Error creating election');
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
          start_date: new Date('2023-10-01T00:00:00.000Z'),
          end_date: new Date('2023-10-31T23:59:59.000Z'),
          type: ElectionType.SINGLECHOICE,
          created_at: new Date(),
          created_by: userId,
          created_by_user: user,
          updated_at: new Date(),
          deleted_at: null,
          status: ElectionStatus.ONGOING,
          candidates: [] as Candidate[],
          votes: [] as Vote[],
          voter_links: [] as VoteLink[],
        },
        {
          id: '550e8400-e29b-41d4-a716-446655440001',
          title: '2023 Parliamentary Election',
          description: 'Election to choose members of parliament',
          start_date: new Date('2023-11-01T00:00:00.000Z'),
          end_date: new Date('2023-11-30T23:59:59.000Z'),
          type: ElectionType.MULTICHOICE,
          created_by: userId,
          deleted_at: null,
          status: ElectionStatus.ONGOING,
          updated_at: new Date(),
          created_by_user: user,
          created_at: new Date(),
          candidates: [] as Candidate[],
          votes: [] as Vote[],
          voter_links: [] as VoteLink[],
        },
      ];

      const total = 2;
      const page = 1;
      const pageSize = 10;

      jest.spyOn(electionRepository, 'findAndCount').mockResolvedValue([elections, total]);

      const result = await service.findAll(page, pageSize);

      expect(result).toEqual({
        status_code: 200,
        message: 'Successfully fetched elections',
        data: {
          currentPage: page,
          totalPages: 1,
          totalResults: total,
          elections: [
            {
              election_id: '550e8400-e29b-41d4-a716-446655440000',
              election_title: '2023 Presidential Election',
              description: 'Election to choose the next president of the country',
              start_date: new Date('2023-10-01T00:00:00.000Z'),
              end_date: new Date('2023-10-31T23:59:59.000Z'),
              election_type: 'single choice',
              created_by: userId,
              candidates: [],
            },
            {
              election_id: '550e8400-e29b-41d4-a716-446655440001',
              election_title: '2023 Parliamentary Election',
              description: 'Election to choose members of parliament',
              start_date: new Date('2023-11-01T00:00:00.000Z'),
              end_date: new Date('2023-11-30T23:59:59.000Z'),
              election_type: 'multiple choice',
              created_by: userId,
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
        skip: 0,
        take: pageSize,
        relations: ['created_by_user', 'candidates', 'votes', 'voter_links'],
      });
    });

    it('should return an empty list if no elections exist', async () => {
      const page = 1;
      const pageSize = 10;

      jest.spyOn(electionRepository, 'findAndCount').mockResolvedValue([[], 0]);

      const result = await service.findAll(page, pageSize);

      expect(result).toEqual({
        status_code: 200,
        message: 'Successfully fetched elections',
        data: {
          currentPage: page,
          totalPages: 0,
          totalResults: 0,
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
        relations: ['created_by_user', 'candidates', 'votes', 'voter_links'],
      });
    });

    it('should handle database errors gracefully', async () => {
      const page = 1;
      const pageSize = 10;

      jest.spyOn(electionRepository, 'findAndCount').mockRejectedValue(new Error('Database connection failed'));

      await expect(service.findAll(page, pageSize)).rejects.toThrow('Database connection failed');

      expect(electionRepository.findAndCount).toHaveBeenCalledWith({
        skip: 0,
        take: pageSize,
        relations: ['created_by_user', 'candidates', 'votes', 'voter_links'],
      });
    });

    it('should throw an error if pagination parameters are invalid', async () => {
      const page = 0;
      const pageSize = -10;

      await expect(service.findAll(page, pageSize)).rejects.toThrow(
        'Invalid pagination parameters. Page and pageSize must be greater than 0.',
      );
    });
  });
  describe('findOne', () => {
    it('should return an election with votes and candidates', async () => {
      const electionId = '123';
      const mockElection = {
        id: electionId,
        title: 'Presidential Election',
        description: 'Election for president',
        start_date: new Date('2024-01-01'),
        end_date: new Date('2024-01-02'),
        type: ElectionType.SINGLECHOICE,
        created_by: 'user123',
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
        message: 'Election fetched successfully', // Ensure SYS_MSG.FETCH_ELECTION is defined
        data: {
          id: electionId,
          title: 'Presidential Election',
          description: 'Election for president',
          start_date: new Date('2024-01-01'),
          end_date: new Date('2024-01-02'),
          election_type: ElectionType.SINGLECHOICE,
          created_by: 'user123',
          total_voters: 3,
          votes: [
            { candidate: 'Candidate A', vote_count: 2 },
            { candidate: 'Candidate B', vote_count: 1 },
          ],
        },
      });

      expect(electionRepository.findOne).toHaveBeenCalledWith({ where: { id: electionId } });
      expect(candidateRepository.find).toHaveBeenCalledWith({ where: { election_id: electionId } });
      expect(voteRepository.find).toHaveBeenCalledWith({ where: { election_id: electionId } });
    });

    it('should throw NotFoundException if election does not exist', async () => {
      electionRepository.findOne = jest.fn().mockResolvedValue(null);

      await expect(service.findOne('nonexistent-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    const electionId = '550e8400-e29b-41d4-a716-446655440000';

    it('should throw NotFoundException if election does not exist', async () => {
      jest.spyOn(electionRepository, 'findOne').mockResolvedValue(null);

      await expect(service.remove(electionId)).rejects.toThrow(NotFoundException);
      expect(electionRepository.findOne).toHaveBeenCalledWith({
        where: { id: electionId },
        relations: ['candidates'],
      });
    });

    it('should throw ForbiddenException if election is ongoing', async () => {
      jest.spyOn(electionRepository, 'findOne').mockResolvedValue({
        id: electionId,
        status: ElectionStatus.ONGOING,
      } as Election);

      await expect(service.remove(electionId)).rejects.toThrow(ForbiddenException);
      expect(electionRepository.findOne).toHaveBeenCalledWith({
        where: { id: electionId },
        relations: ['candidates'],
      });
    });

    it('should delete election if it exists and is not ongoing', async () => {
      const completedElection = {
        id: electionId,
        status: ElectionStatus.COMPLETED,
      };

      jest.spyOn(electionRepository, 'findOne').mockResolvedValue(completedElection as Election);
      jest.spyOn(electionRepository, 'delete').mockResolvedValue({ affected: 1 } as any);

      const result = await service.remove(electionId);

      expect(electionRepository.findOne).toHaveBeenCalledWith({
        where: { id: electionId },
        relations: ['candidates'],
      });
      expect(electionRepository.delete).toHaveBeenCalledWith({ id: electionId });

      expect(result).toEqual({
        status: 'success',
        status_code: 200,
        message: `Election with id ${electionId} deleted successfully`,
      });
    });

    it('should throw InternalServerErrorException if deletion fails', async () => {
      jest.spyOn(electionRepository, 'findOne').mockResolvedValue({
        id: electionId,
        status: ElectionStatus.COMPLETED,
      } as Election);

      jest.spyOn(electionRepository, 'delete').mockRejectedValue(new Error('Delete error'));

      await expect(service.remove(electionId)).rejects.toThrow(InternalServerErrorException);
      expect(electionRepository.findOne).toHaveBeenCalledWith({
        where: { id: electionId },
        relations: ['candidates'],
      });
      expect(electionRepository.delete).toHaveBeenCalledWith({ id: electionId });
    });
  });
});
