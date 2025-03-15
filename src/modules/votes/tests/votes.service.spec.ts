import { Test, TestingModule } from '@nestjs/testing';
import { VoteService } from '../votes.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Vote } from '../entities/votes.entity';
import * as SYS_MSG from '../../../shared/constants/systemMessages';
import { HttpException, HttpStatus } from '@nestjs/common';
import { Election } from '../../election/entities/election.entity';

describe('VoteService', () => {
  let service: VoteService;
  let voteRepository: Repository<Vote>;
  let electionRepository: Repository<Election>;

  const mockVoteRepository = () => ({
    create: jest.fn(),
    save: jest.fn(),
  });

  const mockElectionRepository = () => ({
    findOne: jest.fn(),
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VoteService,
        { provide: getRepositoryToken(Vote), useFactory: mockVoteRepository },
        { provide: getRepositoryToken(Election), useFactory: mockElectionRepository },
      ],
    }).compile();

    service = module.get<VoteService>(VoteService);
    voteRepository = module.get<Repository<Vote>>(getRepositoryToken(Vote));
    electionRepository = module.get<Repository<Election>>(getRepositoryToken(Election));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create vote', () => {
    const validVoteLink = '7384fdbc-a1b9-45ad-a586-72edae14526d';
    const invalidVoteLink = 'invalid-vote-link';
    const createVoteDto = {
      candidate_id: ['7284fdbc-a1b9-45ad-a586-72edae14526d'],
    };
    it('should throw a HttpException when the vote_link is not a valid UUID', async () => {
      await expect(service.createVote(invalidVoteLink, createVoteDto)).rejects.toThrow(
        new HttpException(
          { status_code: HttpStatus.BAD_REQUEST, message: SYS_MSG.INCORRECT_UUID, data: null },
          HttpStatus.BAD_REQUEST,
        ),
      );
      expect(electionRepository.findOne).not.toHaveBeenCalled();
    });
    it('should throw a NotFoundException when the election is not found', async () => {
      jest.spyOn(electionRepository, 'findOne').mockResolvedValue(null);
      await expect(service.createVote(validVoteLink, createVoteDto)).rejects.toThrow(
        new HttpException(
          { status_code: HttpStatus.NOT_FOUND, message: SYS_MSG.ELECTION_NOT_FOUND, data: null },
          HttpStatus.NOT_FOUND,
        ),
      );
      expect(electionRepository.findOne).toHaveBeenCalledWith({
        where: { vote_id: validVoteLink },
        relations: ['candidates'],
      });
    });

    // it('should throw a HttpExpection if election status is not ongoing', async () => {
    //   const election = new Election();
    //   jest.spyOn(electionRepository, 'findOne').mockResolvedValue(election);
    //   await expect(service.createVote(validVoteLink, createVoteDto)).rejects.toThrow(
    //     new HttpException(
    //       {
    //         status_code: HttpStatus.FORBIDDEN,
    //         message: SYS_MSG.ELECTION_ENDED_VOTE_NOT_ALLOWED,
    //         data: null,
    //       },
    //       HttpStatus.FORBIDDEN,
    //     ),
    //   );
    // });

    it('should throw a NotFoundException if candidate is not found', async () => {
      const election = new Election();
      election.candidates = [
        {
          id: '7384fdbc-a1b9-45ad-a556-72edae14526d',
          name: 'Candidate A',
          election_id: '7284fdbc-a1b9-55ad-a586-72edae14526d',
          votes: [],
          created_at: new Date(),
          updated_at: new Date(),
          deleted_at: null,
          election: new Election(),
          photo_url: '',
        },
      ];
      jest.spyOn(electionRepository, 'findOne').mockResolvedValue(election);
      await expect(service.createVote(validVoteLink, createVoteDto)).rejects.toThrow(
        new HttpException(
          {
            status_code: HttpStatus.NOT_FOUND,
            message: SYS_MSG.CANDIDATE_NOT_FOUND,
            data: null,
          },
          HttpStatus.NOT_FOUND,
        ),
      );
    });
    it('should create a new vote', async () => {
      const vote = new Vote();
      vote.id = '7204fdbc-a1b9-55ad-a586-72edae14526d';
      vote.election_id = '7284fdbc-a1b9-55ad-a586-72edae14526d';
      vote.candidate_id = ['7284fdbc-a1b9-45ad-a586-72edae14526d'];
      vote.created_at = new Date();
      vote.updated_at = new Date();

      const election = new Election();
      election.id = '7284fdbc-a1b9-55ad-a586-72edae14526d';
      election.vote_id = validVoteLink;
      election.candidates = [
        {
          id: '7284fdbc-a1b9-45ad-a586-72edae14526d',
          name: 'Candidate A',
          election_id: '7284fdbc-a1b9-55ad-a586-72edae14526d',
          votes: [],
          created_at: new Date(),
          updated_at: new Date(),
          deleted_at: null,
          election: new Election(),
          photo_url: '',
        },
      ];

      jest.spyOn(electionRepository, 'findOne').mockResolvedValue(election);
      jest.spyOn(voteRepository, 'create').mockReturnValue(vote);
      jest.spyOn(voteRepository, 'save').mockResolvedValue(vote);

      const result = await service.createVote(validVoteLink, createVoteDto);

      expect(electionRepository.findOne).toHaveBeenCalledWith({
        where: { vote_id: validVoteLink },
        relations: ['candidates'],
      });
      expect(voteRepository.create).toHaveBeenCalledWith({ ...createVoteDto, election_id: election.id });
      expect(voteRepository.save).toHaveBeenCalledWith(vote);
      expect(result).toEqual({
        status_code: HttpStatus.OK,
        message: SYS_MSG.VOTE_CREATION_MESSAGE,
        data: {
          voter_id: vote.id,
          election_id: vote.election_id,
          candidate_id: vote.candidate_id,
        },
      });
    });
  });
});
