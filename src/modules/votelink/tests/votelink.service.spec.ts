import { Test, TestingModule } from '@nestjs/testing';
import { VoteLinkService } from '../votelink.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { VoteLink } from '../entities/votelink.entity';
import { NotFoundException, HttpStatus } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Election } from '../../election/entities/election.entity';
import { CreateVoteLinkDto } from '../dto/create-votelink.dto';
import { ElectionStatus } from '../../election/entities/election.entity';
import { User } from '../../user/entities/user.entity';
import { randomUUID } from 'crypto';

// Mock repositories
const mock_election_repository = {
  findOne: jest.fn(),
};

const mock_voter_link_repository = {
  create: jest.fn(),
  save: jest.fn(),
  findAndCount: jest.fn(),
  findOne: jest.fn(), // Add this line
  delete: jest.fn(), // Add this line
};

// Mock the randomUUID function
jest.mock('crypto', () => ({
  randomUUID: jest.fn(() => '123e4567-e89b-12d3-a456-426614174000'), // A valid UUID
}));

describe('VoteLinkService', () => {
  let vote_link_service: VoteLinkService;
  let electionRepository: Repository<Election>;
  let voterLinkRepository: Repository<VoteLink>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VoteLinkService,
        {
          provide: getRepositoryToken(Election),
          useValue: mock_election_repository,
        },
        {
          provide: getRepositoryToken(VoteLink),
          useValue: mock_voter_link_repository,
        },
      ],
    }).compile();

    vote_link_service = module.get<VoteLinkService>(VoteLinkService);
    electionRepository = module.get<Repository<Election>>(getRepositoryToken(Election));
    voterLinkRepository = module.get<Repository<VoteLink>>(getRepositoryToken(VoteLink));

    // Mock the APP_URL environment variable
    process.env.APP_URL = 'http://localhost:3000';
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
      });
    });
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

      mock_election_repository.findOne.mockResolvedValue(election);
      mock_voter_link_repository.create.mockReturnValue({
        election,
        election_id: createVoteLinkDto.election_id,
        unique_link,
      });
      mock_voter_link_repository.save.mockResolvedValue({
        election,
        election_id: createVoteLinkDto.election_id,
        unique_link,
      });

      const result = await vote_link_service.create(createVoteLinkDto);

      expect(result).toEqual({
        status_code: HttpStatus.CREATED,
        message: 'Successfully created a votelink',
        data: {
          unique_link,
        },
      });

      expect(mock_election_repository.findOne).toHaveBeenCalledWith({
        where: { id: createVoteLinkDto.election_id },
      });
      expect(mock_voter_link_repository.create).toHaveBeenCalledWith({
        election,
        election_id: createVoteLinkDto.election_id,
        unique_link,
      });
      expect(mock_voter_link_repository.save).toHaveBeenCalled();
    });

    it('should throw an error if the election does not exist', async () => {
      const createVoteLinkDto: CreateVoteLinkDto = {
        election_id: '550e8400-e29b-41d4-a716-446655440000',
      };

      mock_election_repository.findOne.mockResolvedValue(null);

      await expect(vote_link_service.create(createVoteLinkDto)).rejects.toThrow(
        new NotFoundException(`Election with id ${createVoteLinkDto.election_id} not found`),
      );

      expect(mock_election_repository.findOne).toHaveBeenCalledWith({
        where: { id: createVoteLinkDto.election_id },
      });
    });
  });

  describe('findOne', () => {
    it('should return a voting link if found', async () => {
      const electionId = 1;
      const linkId = 1;
      const voterLink = {
        id: '1',
        election_id: '1',
        unique_link: 'unique_link_1',
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
        election: {
          id: '1',
          created_at: new Date(),
          updated_at: new Date(),
          deleted_at: null,
          title: 'Election 1',
          description: 'Description for Election 1',
          start_date: new Date(),
          end_date: new Date(),
          status: ElectionStatus.ONGOING,
          type: 'general',
          created_by: 'user1',
          created_by_user: {} as User,
          candidates: [],
          votes: [],
          voter_links: [],
        },
      } as VoteLink;

      jest.spyOn(voterLinkRepository, 'findOne').mockResolvedValue(voterLink);

      expect(await vote_link_service.findOne(electionId, linkId)).toEqual(voterLink);
    });

    it('should throw a NotFoundException if voting link is not found', async () => {
      const electionId = 1;
      const linkId = 1;

      jest.spyOn(voterLinkRepository, 'findOne').mockResolvedValue(null);

      await expect(vote_link_service.findOne(electionId, linkId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should remove a voting link if found', async () => {
      const electionId = 1;
      const linkId = 1;

      jest.spyOn(voterLinkRepository, 'delete').mockResolvedValue({ affected: 1 } as any);

      await expect(vote_link_service.remove(electionId, linkId)).resolves.toBeUndefined();

      expect(voterLinkRepository.delete).toHaveBeenCalledWith({
        election_id: electionId.toString(),
        id: linkId.toString(),
      });
    });

    it('should throw a NotFoundException if voting link is not found', async () => {
      const electionId = 1;
      const linkId = 1;

      jest.spyOn(voterLinkRepository, 'delete').mockResolvedValue({ affected: 0 } as any);

      await expect(vote_link_service.remove(electionId, linkId)).rejects.toThrow(NotFoundException);

      expect(voterLinkRepository.delete).toHaveBeenCalledWith({
        election_id: electionId.toString(),
        id: linkId.toString(),
      });
    });
  });
});
