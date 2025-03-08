import {
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { isUUID } from 'class-validator';
import { randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import * as SYS_MSG from '../../shared/constants/systemMessages';
import { Candidate } from '../candidate/entities/candidate.entity';
import { CreateElectionDto } from './dto/create-election.dto';
import { ElectionResponseDto } from './dto/election-response.dto';
import { UpdateElectionDto } from './dto/update-election.dto';
import { Election, ElectionStatus, ElectionType } from './entities/election.entity';

@Injectable()
export class ElectionService {
  private readonly logger = new Logger(ElectionService.name);

  constructor(
    @InjectRepository(Election) private electionRepository: Repository<Election>,
    @InjectRepository(Candidate) private candidateRepository: Repository<Candidate>,
  ) {}

  async create(createElectionDto: CreateElectionDto, adminId: string): Promise<any> {
    const { title, description, startDate, endDate, electionType, candidates, start_time, end_time } =
      createElectionDto;
    // Create a new election instance.
    const election = this.electionRepository.create({
      title,
      description,
      start_date: startDate,
      end_date: endDate,
      status: ElectionStatus.ONGOING,
      type: electionType,
      vote_link: randomUUID(),
      start_time: start_time,
      end_time: end_time,
      created_by: adminId,
    });

    const savedElection = await this.electionRepository.save(election);

    // Map candidate names to Candidate entities.
    const candidateEntities: Candidate[] = candidates.map(name => {
      const candidate = new Candidate();
      candidate.name = name;
      candidate.election = savedElection;
      return candidate;
    });

    // Save candidates and attach them to the election.
    savedElection.candidates = await this.candidateRepository.save(candidateEntities);

    return {
      status_code: HttpStatus.CREATED,
      message: SYS_MSG.ELECTION_CREATED,
      data: {
        election_id: savedElection.id,
        election_title: savedElection.title,
        description: savedElection.description,
        start_date: savedElection.start_date,
        end_date: savedElection.end_date,
        start_time: savedElection.start_time,
        status: savedElection.status,
        end_time: savedElection.end_time,
        vote_link: savedElection.vote_link,
        election_type: savedElection.type === 'singlechoice' ? ElectionType.SINGLECHOICE : ElectionType.MULTICHOICE,
        created_by: savedElection.created_by,
        candidates: savedElection.candidates.map(candidate => candidate.name),
      },
    };
  }

  async findAll(
    page: number,
    pageSize: number,
  ): Promise<{
    status_code: number;
    message: string;
    data: {
      currentPage: number;
      totalPages: number;
      totalResults: number;
      elections: ElectionResponseDto[];
      meta: any;
    };
  }> {
    if (page < 1 || pageSize < 1) {
      throw new Error('Invalid pagination parameters. Page and pageSize must be greater than 0.');
    }
    const skip = (page - 1) * pageSize;

    const [result, total] = await this.electionRepository.findAndCount({
      skip,
      take: pageSize,
      relations: ['created_by_user', 'candidates', 'votes'],
    });

    const data = this.mapElections(result);
    const totalPages = Math.ceil(total / pageSize);

    return {
      status_code: HttpStatus.OK,
      message: SYS_MSG.FETCH_ELECTIONS,
      data: {
        currentPage: page,
        totalPages,
        totalResults: total,
        elections: data,
        meta: {
          hasNext: page < totalPages,
          total,
          nextPage: page < totalPages ? page + 1 : null,
          prevPage: page > 1 ? page - 1 : null,
        },
      },
    };
  }

  async findOne(id: string) {
    if (!isUUID(id)) {
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
      where: { id },
      relations: ['candidates'],
    });

    if (!election) {
      throw new NotFoundException({
        status_code: HttpStatus.NOT_FOUND,
        message: SYS_MSG.ELECTION_NOT_FOUND,
        data: null,
      });
    }

    return {
      status_code: HttpStatus.OK,
      message: SYS_MSG.FETCH_ELECTION,
      data: {
        election,
      },
    };
  }

  update(id: number, updateElectionDto: UpdateElectionDto) {
    return updateElectionDto;
  }

  async remove(id: string) {
    if (!isUUID(id)) {
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
      where: { id },
      relations: ['candidates'],
    });

    if (!election) {
      throw new NotFoundException({
        status_code: HttpStatus.NOT_FOUND,
        message: SYS_MSG.ELECTION_NOT_FOUND,
        data: null,
      });
    }

    if (election.status === ElectionStatus.ONGOING) {
      throw new ForbiddenException({
        status_code: HttpStatus.FORBIDDEN,
        message: SYS_MSG.ELECTION_ACTIVE_CANNOT_DELETE,
        data: null,
      });
    }

    try {
      // Step 1: Delete candidates linked to this election
      await this.candidateRepository.delete({ election: { id } });

      // Step 2: Now delete the election
      await this.electionRepository.delete({ id });

      return {
        status_code: HttpStatus.OK,
        message: SYS_MSG.ELECTION_DELETED,
        data: null,
      };
    } catch (error) {
      this.logger.error(`Error deleting election with id ${id}: ${error.message}`, error.stack);
      throw new InternalServerErrorException(`Internal error occurred: ${error.message}`);
    }
  }

  async getElectionByVoterLink(vote_link: string) {
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

    if (election?.status === ElectionStatus.COMPLETED) {
      throw new HttpException(
        {
          status_code: HttpStatus.FORBIDDEN,
          message: SYS_MSG.ELECTION_ENDED_VOTE_NOT_ALLOWED,
          data: null,
        },
        HttpStatus.FORBIDDEN,
      );
    }

    return {
      status_code: HttpStatus.OK,
      message: SYS_MSG.FETCH_ELECTION_BY_VOTER_LINK,
      data: election,
    };
  }

  private mapElections(result: Election[]): ElectionResponseDto[] {
    return result
      .map(election => {
        if (!election.created_by) {
          console.warn(`Admin for election with ID ${election.id} not found.`);
          return null;
        }

        let electionType: ElectionType;
        if (election.type === 'singlechoice') {
          electionType = ElectionType.SINGLECHOICE;
        } else if (election.type === 'multichoice') {
          electionType = ElectionType.MULTICHOICE;
        } else {
          console.warn(`Unknown election type "${election.type}" for election with ID ${election.id}.`);
          electionType = ElectionType.SINGLECHOICE;
        }

        return {
          election_id: election.id,
          election_title: election.title,
          description: election.description,
          start_date: election.start_date,
          end_date: election.end_date,
          vote_link: election.vote_link,
          election_type: electionType,
          start_time: election.start_time,
          status: election.status,
          end_time: election.end_time,
          created_by: election.created_by,
          candidates: election.candidates.map(candidate => candidate.name),
        };
      })
      .filter(election => election !== null);
  }
}
