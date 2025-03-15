import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { Voter } from './entities/voter.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { isUUID } from 'class-validator';
import * as SYS_MSG from '../../shared/constants/systemMessages';
import { Election } from '../election/entities/election.entity';

@Injectable()
export class VoterService {
  constructor(
    @InjectRepository(Voter) private voterRepository: Repository<Voter>,
    @InjectRepository(Election) private electionRepository: Repository<Election>,
  ) {}

  async findAll(
    page: number,
    pageSize: number,
    adminId: string,
    electionId: string,
  ): Promise<{
    status_code: number;
    message: string;
    data: {
      current_page: number;
      total_pages: number;
      total_results: number;
      voter_list: any;
      meta: any;
    };
  }> {
    if (!adminId) {
      throw new HttpException(
        { status_code: 401, message: SYS_MSG.UNAUTHORIZED_USER, data: null },
        HttpStatus.UNAUTHORIZED,
      );
    }

    if (!isUUID(adminId)) {
      throw new HttpException(
        { status_code: 400, message: SYS_MSG.INCORRECT_UUID, data: null },
        HttpStatus.BAD_REQUEST,
      );
    }

    if (page < 1 || pageSize < 1) {
      throw new HttpException(
        {
          status_code: 400,
          message: 'Invalid pagination parameters. Page and pageSize must be greater than 0.',
          data: null,
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const skip = (page - 1) * pageSize;

    const election = await this.electionRepository.findOne({
      where: { created_by: adminId, id: electionId },
    });

    if (!election) {
      throw new HttpException(
        { status_code: 404, message: SYS_MSG.ELECTION_NOT_FOUND, data: null },
        HttpStatus.NOT_FOUND,
      );
    }

    const [voter_list, total] = await this.voterRepository.findAndCount({
      where: { election: { id: electionId } },
      skip,
      take: pageSize,
      relations: ['election'],
    });

    if (total === 0) {
      throw new HttpException(
        { status_code: 404, message: SYS_MSG.ELECTION_VOTERS_NOT_FOUND, data: null },
        HttpStatus.NOT_FOUND,
      );
    }

    const data = voter_list.map(voter => ({
      election_id: voter.election?.id,
      name: voter.name,
      email: voter.email,
    }));

    const total_pages = Math.ceil(total / pageSize);

    return {
      status_code: HttpStatus.OK,
      message: SYS_MSG.FETCH_ELECTION_VOTER_LIST,
      data: {
        current_page: page,
        total_pages,
        total_results: total,
        voter_list: data,
        meta: {
          hasNext: page < total_pages,
          total,
          nextPage: page < total_pages ? page + 1 : null,
          prevPage: page > 1 ? page - 1 : null,
        },
      },
    };
  }
}
