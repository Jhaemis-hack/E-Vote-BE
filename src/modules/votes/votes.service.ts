import { ConflictException, HttpException, HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { isUUID } from 'class-validator';
import { Repository } from 'typeorm';
import * as SYS_MSG from '../../shared/constants/systemMessages';
import { Election, ElectionStatus, ElectionType } from '../election/entities/election.entity';
import { CreateVoteDto } from './dto/create-votes.dto';
import { Vote } from './entities/votes.entity';
import { Voter } from '../voter/entities/voter.entity';

@Injectable()
export class VoteService {
  constructor(
    @InjectRepository(Vote) private voteRepository: Repository<Vote>,
    @InjectRepository(Election) private electionRepository: Repository<Election>,
    @InjectRepository(Voter) private voterRepository: Repository<Voter>,
  ) {}

  async createVote(vote_link: string, createVoteDto: CreateVoteDto) {
    const voter = await this.getVoter(vote_link);

    if (voter.is_voted) {
      throw new ConflictException({
        status_code: HttpStatus.CONFLICT,
        message: SYS_MSG.ALREADY_VOTED,
        data: null,
      });
    }

    if (!voter.election) {
      throw new NotFoundException({
        status_code: HttpStatus.NOT_FOUND,
        message: SYS_MSG.ELECTION_NOT_FOUND,
        data: null,
      });
    }

    const election = await this.electionRepository.findOne({
      where: { id: voter.election.id },
      relations: ['candidates'],
    });

    if (!election) {
      throw new NotFoundException({
        status_code: HttpStatus.NOT_FOUND,
        message: SYS_MSG.ELECTION_NOT_FOUND,
        data: null,
      });
    }

    if (election.status === ElectionStatus.COMPLETED) {
      throw new HttpException(
        {
          status_code: HttpStatus.FORBIDDEN,
          message: SYS_MSG.ELECTION_ENDED_VOTE_NOT_ALLOWED,
          data: null,
        },
        HttpStatus.FORBIDDEN,
      );
    } else if (election.status === ElectionStatus.UPCOMING) {
      throw new HttpException(
        {
          status_code: HttpStatus.FORBIDDEN,
          message: SYS_MSG.ELECTION_HAS_NOT_STARTED,
          data: null,
        },
        HttpStatus.FORBIDDEN,
      );
    }

    if (
      election.type === ElectionType.MULTIPLECHOICE &&
      createVoteDto.candidate_id.length > (election.max_choices ?? 0)
    ) {
      throw new HttpException(
        {
          status_code: HttpStatus.BAD_REQUEST,
          message: `You can select up to ${election.max_choices} candidates.`,
          data: null,
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const validCandidateIds = election.candidates.map(candidate => candidate.id);
    const invalidCandidates = createVoteDto.candidate_id.filter(id => !validCandidateIds.includes(id));

    if (invalidCandidates.length > 0) {
      throw new NotFoundException({
        status_code: HttpStatus.NOT_FOUND,
        message: SYS_MSG.CANDIDATE_NOT_FOUND,
        data: null,
      });
    }

    const newVote = this.voteRepository.create({
      ...createVoteDto,
      election_id: election.id,
      voter_id: voter.id,
    });

    const savedVote = await this.voteRepository.save(newVote);

    voter.is_voted = true;
    await this.voterRepository.save(voter);

    return {
      status_code: HttpStatus.OK,
      message: SYS_MSG.VOTE_CREATION_MESSAGE,
      data: {
        voter_id: voter.id,
        election_id: savedVote.election_id,
        candidate_id: savedVote.candidate_id,
      },
    };
  }

  async getVoter(vote_link: string): Promise<Voter> {
    if (!isUUID(vote_link)) {
      throw new HttpException(
        {
          status_code: HttpStatus.BAD_REQUEST,
          message: SYS_MSG.INCORRECT_UUID,
          data: null,
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const voterExist = await this.voterRepository.findOne({
      where: { verification_token: vote_link },
      relations: ['election'],
    });

    if (!voterExist) {
      throw new NotFoundException({
        status_code: HttpStatus.NOT_FOUND,
        message: SYS_MSG.INVALID_VOTE_LINK,
        data: null,
      });
    }

    return voterExist;
  }
}
