import { Test, TestingModule } from '@nestjs/testing';
import { VoteLinkService } from '../votelink.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { VoterLink } from '../entities/votelink.entity';
import { NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Election } from '../../election/entities/election.entity';
import { HttpStatus, NotFoundException } from '@nestjs/common';
import { CreateVoteLinkDto } from '../dto/create-votelink.dto';
import { randomUUID } from 'crypto';

const mock_election_repository = {
  findOne: jest.fn(),
};

const mock_voter_link_repository = {
  findAndCount: jest.fn(),
};

describe('VoteLinkService', () => {
  let vote_link_service: VoteLinkService;


// Mock the randomUUID function to return a fixed value
jest.mock('crypto', () => ({
  randomUUID: jest.fn(() => '123e4567-e89b-12d3-a456-426614174000'), // A valid UUID
}));

describe('VoteLinkService', () => {
  let service: VoteLinkService;
  let voteLinkRepository: Repository<VoteLink>;
  let electionRepository: Repository<Election>;

  const mockVoteLinkRepository = () => ({
    create: jest.fn(),
    save: jest.fn(),
  });

  const mockElectionRepository = () => ({
    findOne: jest.fn(),
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VoteLinkService,
        {
          provide: getRepositoryToken(Election),
          useValue: mock_election_repository,
        },
        {
          provide: getRepositoryToken(VoterLink),
          useValue: mock_voter_link_repository,
          provide: getRepositoryToken(VoteLink),
          useFactory: mockVoteLinkRepository,
        },
        {
          provide: getRepositoryToken(Election),
          useFactory: mockElectionRepository,
        },
      ],
    }).compile();

    vote_link_service = module.get<VoteLinkService>(VoteLinkService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should throw an error if the election is not found', async () => {
      const election_id = 'invalid-election-id';
      const query = { page: 1, limit: 10 };

      mock_election_repository.findOne.mockResolvedValue(null);

      await expect(vote_link_service.findAll(election_id, query)).rejects.toThrow(
        new NotFoundException('Election not found'),
      );
    });

    it('should return voting links with pagination', async () => {
      const election_id = 'valid-election-id';
      const query = { page: 1, limit: 10 };

      mock_election_repository.findOne.mockResolvedValue({ id: election_id });

      mock_voter_link_repository.findAndCount.mockResolvedValue([
        [
          { id: 'link-1', election_id: election_id, link: 'voting-link-1' },
          { id: 'link-2', election_id: election_id, link: 'voting-link-2' },
        ],
        2,
      ]);

      const result = await vote_link_service.findAll(election_id, query);

      expect(result).toEqual({
        total: 2,
        page: 1,
        totalPages: 1,
        voterLinks: [
          { id: 'link-1', election_id: election_id, link: 'voting-link-1' },
          { id: 'link-2', election_id: election_id, link: 'voting-link-2' },
        ],
      });
    });

    it('should handle pagination correctly when page and limit are specified', async () => {
      const election_id = 'valid-election-id';
      const query = { page: 2, limit: 5 };

      mock_election_repository.findOne.mockResolvedValue({ id: election_id });

      mock_voter_link_repository.findAndCount.mockResolvedValue([
        [
          { id: 'link-1', election_id: election_id, link: 'voting-link-1' },
          { id: 'link-2', election_id: election_id, link: 'voting-link-2' },
        ],
        12,
      ]);

      const result = await vote_link_service.findAll(election_id, query);

      expect(result).toEqual({
        total: 12,
        page: 2,
        totalPages: 3,
        voterLinks: [
          { id: 'link-1', election_id: election_id, link: 'voting-link-1' },
          { id: 'link-2', election_id: election_id, link: 'voting-link-2' },
        ],
      });
    });

    it('should return empty voter links if no links exist for the election', async () => {
      const election_id = 'valid-election-id';
      const query = { page: 1, limit: 10 };

      mock_election_repository.findOne.mockResolvedValue({ id: election_id });

      mock_voter_link_repository.findAndCount.mockResolvedValue([[], 0]);

      const result = await vote_link_service.findAll(election_id, query);

      expect(result).toEqual({
        total: 0,
        page: 1,
        totalPages: 0,
        voterLinks: [],
    service = module.get<VoteLinkService>(VoteLinkService);
    voteLinkRepository = module.get<Repository<VoteLink>>(getRepositoryToken(VoteLink));
    electionRepository = module.get<Repository<Election>>(getRepositoryToken(Election));

    // Mock the APP_URL environment variable
    process.env.APP_URL = 'http://localhost:3000';
  });

  describe('create', () => {
    it('should successfully create a vote link', async () => {
      const createVoteLinkDto: CreateVoteLinkDto = {
        election_id: '550e8400-e29b-41d4-a716-446655440000',
      };

      const election = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        title: '2023 Presidential Election',
      } as Election;

      const unique_link = `${process.env.APP_URL}/vote/123e4567-e89b-12d3-a456-426614174000`;

      jest.spyOn(electionRepository, 'findOne').mockResolvedValue(election);
      jest.spyOn(voteLinkRepository, 'create').mockReturnValue({
        election,
        election_id: createVoteLinkDto.election_id,
        unique_link,
      } as VoteLink);
      jest.spyOn(voteLinkRepository, 'save').mockResolvedValue({
        election,
        election_id: createVoteLinkDto.election_id,
        unique_link,
      } as VoteLink);

      const result = await service.create(createVoteLinkDto);

      expect(result).toEqual({
        status_code: HttpStatus.CREATED,
        message: 'Successfully created a votelink',
        data: {
          unique_link,
        },
      });

      expect(electionRepository.findOne).toHaveBeenCalledWith({
        where: { id: createVoteLinkDto.election_id },
      });
      expect(voteLinkRepository.create).toHaveBeenCalledWith({
        election,
        election_id: createVoteLinkDto.election_id,
        unique_link,
      });
      expect(voteLinkRepository.save).toHaveBeenCalled();
    });

    it('should throw an error if the election does not exist', async () => {
      const createVoteLinkDto: CreateVoteLinkDto = {
        election_id: '550e8400-e29b-41d4-a716-446655440000',
      };

      jest.spyOn(electionRepository, 'findOne').mockResolvedValue(null);

      await expect(service.create(createVoteLinkDto)).rejects.toThrow(
        new NotFoundException(`Election with id ${createVoteLinkDto.election_id} not found`),
      );

      expect(electionRepository.findOne).toHaveBeenCalledWith({
        where: { id: createVoteLinkDto.election_id },
      });
    });

    it('should generate a unique link correctly', async () => {
      const createVoteLinkDto: CreateVoteLinkDto = {
        election_id: '550e8400-e29b-41d4-a716-446655440000',
      };

      const election = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        title: '2023 Presidential Election',
      } as Election;

      const unique_link = `${process.env.APP_URL}/vote/123e4567-e89b-12d3-a456-426614174000`;

      jest.spyOn(electionRepository, 'findOne').mockResolvedValue(election);
      jest.spyOn(voteLinkRepository, 'create').mockReturnValue({
        election,
        election_id: createVoteLinkDto.election_id,
        unique_link,
      } as VoteLink);
      jest.spyOn(voteLinkRepository, 'save').mockResolvedValue({
        election,
        election_id: createVoteLinkDto.election_id,
        unique_link,
      } as VoteLink);

      const result = await service.create(createVoteLinkDto);

      expect(result.data.unique_link).toContain(`${process.env.APP_URL}/vote/`);
      expect(result.data.unique_link).toHaveLength(process.env.APP_URL!.length + 6 + 36); // 6 for "/vote/", 36 for UUID
    });

    it('should save the vote link to the database', async () => {
      const createVoteLinkDto: CreateVoteLinkDto = {
        election_id: '550e8400-e29b-41d4-a716-446655440000',
      };

      const election = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        title: '2023 Presidential Election',
      } as Election;

      const unique_link = `${process.env.APP_URL}/vote/123e4567-e89b-12d3-a456-426614174000`;

      jest.spyOn(electionRepository, 'findOne').mockResolvedValue(election);
      jest.spyOn(voteLinkRepository, 'create').mockReturnValue({
        election,
        election_id: createVoteLinkDto.election_id,
        unique_link,
      } as VoteLink);
      jest.spyOn(voteLinkRepository, 'save').mockResolvedValue({
        election,
        election_id: createVoteLinkDto.election_id,
        unique_link,
      } as VoteLink);

      await service.create(createVoteLinkDto);

      expect(voteLinkRepository.save).toHaveBeenCalledWith({
        election,
        election_id: createVoteLinkDto.election_id,
        unique_link,
      });
    });
  });
});
