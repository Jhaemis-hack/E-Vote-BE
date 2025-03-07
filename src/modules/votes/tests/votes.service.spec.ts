import { Test, TestingModule } from '@nestjs/testing';
import { VoteService } from '../votes.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Vote } from '../entities/votes.entity';

describe('VoteService', () => {
  let service: VoteService;
  let voteRepository: Repository<Vote>;

  const mockVoteRepository = () => ({
    create: jest.fn(),
    save: jest.fn(),
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [VoteService, { provide: getRepositoryToken(Vote), useFactory: mockVoteRepository }],
    }).compile();

    service = module.get<VoteService>(VoteService);
    voteRepository = module.get<Repository<Vote>>(getRepositoryToken(Vote));
  });

  describe('create vote', () => {
    it('should create a new vote', async () => {
      const createVoteDto = {
        candidate_id: ['some-candidate-id'],
        election_id: 'some-election-id',
      };
      const vote = new Vote();
      vote.id = 'vote-id';
      vote.election_id = 'some-election-id';
      vote.candidate_id = ['some-candidate-id'];
      vote.created_at = new Date();
      vote.updated_at = new Date();

      jest.spyOn(voteRepository, 'create').mockReturnValue(vote);
      jest.spyOn(voteRepository, 'save').mockResolvedValue(vote);

      const result = await service.createVote(createVoteDto);

      expect(voteRepository.create).toHaveBeenCalledWith(createVoteDto);
      expect(voteRepository.save).toHaveBeenCalledWith(vote);
      expect(result).toEqual({
        status: 'success',
        message: 'vote created successfully',
        data: vote,
      });
    });
  });
});
