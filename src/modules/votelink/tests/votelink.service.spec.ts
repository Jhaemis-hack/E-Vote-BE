import { Test, TestingModule } from '@nestjs/testing';
import { VoteLinkService } from '../votelink.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { VoterLink } from '../entities/votelink.entity';
import { Election } from '../../election/entities/election.entity';
import { NotFoundException } from '@nestjs/common';

const mock_election_repository = {
  findOne: jest.fn(),
};

const mock_voter_link_repository = {
  findAndCount: jest.fn(),
};

describe('VoteLinkService', () => {
  let vote_link_service: VoteLinkService;

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
      });
    });
  });
});
