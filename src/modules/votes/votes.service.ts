import { HttpException, HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { CreateVoteDto } from './dto/create-votes.dto';
import { UpdateVoteDto } from './dto/update-votes.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Vote } from './entities/votes.entity';
import { Repository } from 'typeorm';
import * as SYS_MSG from '../../shared/constants/systemMessages';
import { isUUID } from 'class-validator';
import { Election, ElectionStatus } from '../election/entities/election.entity';

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
      where: { vote_link: vote_link },
      relations: ['candidates'],
    });
    if (!election) {
      throw new NotFoundException({
        status_code: HttpStatus.NOT_FOUND,
        message: SYS_MSG.ELECTION_NOT_FOUND,
        data: null,
      });
    }
    if (election?.status !== ElectionStatus.ONGOING) {
      throw new HttpException(
        {
          status_code: HttpStatus.FORBIDDEN,
          message: SYS_MSG.ELECTION_ENDED_VOTE_NOT_ALLOWED,
          data: null,
        },
        HttpStatus.FORBIDDEN,
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
      status: HttpStatus.OK,
      message: SYS_MSG.VOTE_CREATION_MESSAGE,
    };
  }

  findAll() {
    return `This action returns all vote`;
  }

  findOne(id: number) {
    return `This action returns a #${id} vote`;
  }

  update(id: number, UpdateVoteDto: UpdateVoteDto) {
    return `This action updates a #${id} vote`;
  }

  remove(id: number) {
    return `This action removes a #${id} vote`;
  }
}
