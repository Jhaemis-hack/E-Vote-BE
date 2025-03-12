import { HttpException, HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { isUUID } from 'class-validator';
import { Repository } from 'typeorm';
import * as SYS_MSG from '../../shared/constants/systemMessages';
import { Election, ElectionStatus, ElectionType } from '../election/entities/election.entity';
import { CreateVoteDto } from './dto/create-votes.dto';
import { Vote } from './entities/votes.entity';

@Injectable()
export class VoteService {
  constructor(
    @InjectRepository(Vote) private voteRepository: Repository<Vote>,
    @InjectRepository(Election) private electionRepository: Repository<Election>,
  ) {}

  async createVote(vote_link: string, createVoteDto: CreateVoteDto) {
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
    const election = await this.electionRepository.findOne({
      where: { vote_id: vote_link },
      relations: ['candidates'],
    });
    if (!election) {
      throw new NotFoundException({
        status_code: HttpStatus.NOT_FOUND,
        message: SYS_MSG.ELECTION_NOT_FOUND,
        data: null,
      });
    }
    // if (election?.status !== ElectionStatus.ONGOING) {
    //   throw new HttpException(
    //     {
    //       status_code: HttpStatus.FORBIDDEN,
    //       message: SYS_MSG.ELECTION_ENDED_VOTE_NOT_ALLOWED,
    //       data: null,
    //     },
    //     HttpStatus.FORBIDDEN,
    //   );
    // }

    if (election.status === ElectionStatus.COMPLETED) {
      throw new HttpException(
        {
          status_code: HttpStatus.FORBIDDEN,
          message: SYS_MSG.ERROR_VOTER_ACCESS,
          data: null,
        },
        HttpStatus.FORBIDDEN,
      );
    } else if (election.status === ElectionStatus.UPCOMING) {
      throw new HttpException(
        {
          status_code: HttpStatus.FORBIDDEN,
          message: SYS_MSG.ERROR_VOTER_ACCESS,
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
          message: `You can select up to ${election.max_choices} candidates`,
          data: null,
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const candidates = election.candidates.map(candidate => candidate.id);
    const invalid_candidates = createVoteDto.candidate_id.filter(id => !candidates.includes(id));
    if (invalid_candidates.length > 0) {
      throw new NotFoundException({
        status_code: HttpStatus.NOT_FOUND,
        message: SYS_MSG.CANDIDATE_NOT_FOUND,
        data: null,
      });
    }
    const new_vote = this.voteRepository.create({ ...createVoteDto, election_id: election.id });
    const saved_vote = await this.voteRepository.save(new_vote);
    return {
      status_code: HttpStatus.OK,
      message: SYS_MSG.VOTE_CREATION_MESSAGE,
      data: {
        voter_id: saved_vote.id,
        election_id: saved_vote.election_id,
        candidate_id: saved_vote.candidate_id,
      },
    };
  }
}
