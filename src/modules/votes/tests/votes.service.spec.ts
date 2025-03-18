import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, HttpException, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { VoteService } from '../votes.service';
import { Vote } from '../entities/votes.entity';
import { Election, ElectionStatus, ElectionType } from '../../election/entities/election.entity';
import { Voter } from '../../voter/entities/voter.entity';
import { CreateVoteDto } from '../dto/create-votes.dto';
import * as SYS_MSG from '../../../shared/constants/systemMessages';

describe('VoteService', () => {
  let service: VoteService;
  let voteRepository: Repository<Vote>;
  let electionRepository: Repository<Election>;
  let voterRepository: Repository<Voter>;

  const mockVoteRepository = () => ({
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
  });

  const mockElectionRepository = () => ({
    findOne: jest.fn(),
  });

  const mockVoterRepository = () => ({
    findOne: jest.fn(),
    save: jest.fn(),
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VoteService,
        {
          provide: getRepositoryToken(Vote),
          useFactory: mockVoteRepository,
        },
        {
          provide: getRepositoryToken(Election),
          useFactory: mockElectionRepository,
        },
        {
          provide: getRepositoryToken(Voter),
          useFactory: mockVoterRepository,
        },
      ],
    }).compile();

    service = module.get<VoteService>(VoteService);
    voteRepository = module.get<Repository<Vote>>(getRepositoryToken(Vote));
    electionRepository = module.get<Repository<Election>>(getRepositoryToken(Election));
    voterRepository = module.get<Repository<Voter>>(getRepositoryToken(Voter));
  });

  describe('getVoter', () => {
    it('should throw an exception if vote_link is not a valid UUID', async () => {
      await expect(service.getVoter('not-a-uuid')).rejects.toThrow(HttpException);
    });

    it('should throw NotFoundException if voter does not exist', async () => {
      const mockVote_link = '123e4567-e89b-12d3-a456-426614174000';
      jest.spyOn(voterRepository, 'findOne').mockResolvedValue(null);

      await expect(service.getVoter(mockVote_link)).rejects.toThrow(NotFoundException);
      expect(voterRepository.findOne).toHaveBeenCalledWith({
        where: { verification_token: mockVote_link },
        relations: ['election'],
      });
    });

    it('should return a voter if found', async () => {
      const mockVote_link = '123e4567-e89b-12d3-a456-426614174000';
      const mockVoter = { id: 'voter-id', is_voted: false, election: { id: 'election-id' } };

      jest.spyOn(voterRepository, 'findOne').mockResolvedValue(mockVoter as any);

      const result = await service.getVoter(mockVote_link);

      expect(voterRepository.findOne).toHaveBeenCalledWith({
        where: { verification_token: mockVote_link },
        relations: ['election'],
      });
      expect(result).toEqual(mockVoter);
    });
  });

  describe('createVote', () => {
    const mockVote_link = '123e4567-e89b-12d3-a456-426614174000';
    const mockCreateVoteDto: CreateVoteDto = { candidate_id: ['candidate-1'] };
    const mockVoter = {
      id: 'voter-id',
      is_voted: false,
      election: { id: 'election-id' },
    };
    const mockElection = {
      id: 'election-id',
      status: ElectionStatus.ONGOING,
      type: ElectionType.SINGLECHOICE,
      candidates: [{ id: 'candidate-1' }, { id: 'candidate-2' }],
      max_choices: 1,
    };
    const mockNewVote = {
      candidate_id: ['candidate-1'],
      election_id: 'election-id',
      voter_id: 'voter-id',
    };
    const mockSavedVote = {
      id: 'vote-id',
      ...mockNewVote,
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should throw ConflictException if voter has already voted', async () => {
      const votedVoter = { ...mockVoter, is_voted: true };
      jest.spyOn(service, 'getVoter').mockResolvedValue(votedVoter as any);

      await expect(service.createVote(mockVote_link, mockCreateVoteDto)).rejects.toThrow(ConflictException);
      expect(service.getVoter).toHaveBeenCalledWith(mockVote_link);
    });

    it('should throw NotFoundException if election does not exist in voter object', async () => {
      const voterWithoutElection = { ...mockVoter, election: null };
      jest.spyOn(service, 'getVoter').mockResolvedValue(voterWithoutElection as any);

      await expect(service.createVote(mockVote_link, mockCreateVoteDto)).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if election cannot be found', async () => {
      jest.spyOn(service, 'getVoter').mockResolvedValue(mockVoter as any);
      jest.spyOn(electionRepository, 'findOne').mockResolvedValue(null);

      await expect(service.createVote(mockVote_link, mockCreateVoteDto)).rejects.toThrow(NotFoundException);
      expect(electionRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockVoter.election.id },
        relations: ['candidates'],
      });
    });

    it('should throw HttpException if election is completed', async () => {
      jest.spyOn(service, 'getVoter').mockResolvedValue(mockVoter as any);
      const completedElection = { ...mockElection, status: ElectionStatus.COMPLETED };
      jest.spyOn(electionRepository, 'findOne').mockResolvedValue(completedElection as any);

      await expect(service.createVote(mockVote_link, mockCreateVoteDto)).rejects.toThrow(HttpException);
    });

    it('should throw HttpException if election is upcoming', async () => {
      jest.spyOn(service, 'getVoter').mockResolvedValue(mockVoter as any);
      const upcomingElection = { ...mockElection, status: ElectionStatus.UPCOMING };
      jest.spyOn(electionRepository, 'findOne').mockResolvedValue(upcomingElection as any);

      await expect(service.createVote(mockVote_link, mockCreateVoteDto)).rejects.toThrow(HttpException);
    });

    it('should throw HttpException if too many candidates selected for multiple choice election', async () => {
      jest.spyOn(service, 'getVoter').mockResolvedValue(mockVoter as any);
      const multipleChoiceElection = {
        ...mockElection,
        type: ElectionType.MULTIPLECHOICE,
        max_choices: 1,
      };
      jest.spyOn(electionRepository, 'findOne').mockResolvedValue(multipleChoiceElection as any);

      const invalidVoteDto = { candidate_id: ['candidate-1', 'candidate-2'] };

      await expect(service.createVote(mockVote_link, invalidVoteDto)).rejects.toThrow(HttpException);
    });

    it('should throw NotFoundException if candidate does not exist in the election', async () => {
      jest.spyOn(service, 'getVoter').mockResolvedValue(mockVoter as any);
      jest.spyOn(electionRepository, 'findOne').mockResolvedValue(mockElection as any);

      const invalidCandidateVoteDto = { candidate_id: ['non-existent-candidate'] };

      await expect(service.createVote(mockVote_link, invalidCandidateVoteDto)).rejects.toThrow(NotFoundException);
    });

    it('should successfully create a vote and mark voter as voted', async () => {
      jest.spyOn(service, 'getVoter').mockResolvedValue(mockVoter as any);
      jest.spyOn(electionRepository, 'findOne').mockResolvedValue(mockElection as any);
      jest.spyOn(voteRepository, 'create').mockReturnValue(mockNewVote as any);
      jest.spyOn(voteRepository, 'save').mockResolvedValue(mockSavedVote as any);
      jest.spyOn(voterRepository, 'save').mockResolvedValue({ ...mockVoter, is_voted: true } as any);

      const result = await service.createVote(mockVote_link, mockCreateVoteDto);

      expect(voteRepository.create).toHaveBeenCalledWith({
        ...mockCreateVoteDto,
        election_id: mockElection.id,
        voter_id: mockVoter.id,
      });
      expect(voteRepository.save).toHaveBeenCalledWith(mockNewVote);
      expect(voterRepository.save).toHaveBeenCalledWith({ ...mockVoter, is_voted: true });
      expect(result).toEqual({
        status_code: 200,
        message: SYS_MSG.VOTE_CREATION_MESSAGE,
        data: {
          voter_id: mockVoter.id,
          election_id: mockSavedVote.election_id,
          candidate_id: mockSavedVote.candidate_id,
        },
      });
    });
  });
});
