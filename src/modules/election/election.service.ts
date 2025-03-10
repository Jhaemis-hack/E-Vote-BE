import {
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsUUID, isUUID } from 'class-validator';
import { randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import * as SYS_MSG from '../../shared/constants/systemMessages';
import { Vote } from '../votes/entities/votes.entity';
import { Candidate } from '../candidate/entities/candidate.entity';
import { CreateElectionDto } from './dto/create-election.dto';
import { UpdateElectionDto } from './dto/update-election.dto';
import { Election, ElectionStatus } from './entities/election.entity';
import { ElectionResultsDto } from './dto/results.dto';

interface ElectionResultsDownload {
  filename: string;
  csvData: string;
}

@Injectable()
export class ElectionService {
  private readonly logger = new Logger(ElectionService.name);

  constructor(
    @InjectRepository(Election) private electionRepository: Repository<Election>,
    @InjectRepository(Candidate) private candidateRepository: Repository<Candidate>,
    @InjectRepository(Vote) private voteRepository: Repository<Vote>,
  ) {}

  async create(createElectionDto: CreateElectionDto, adminId: string): Promise<any> {
    const { title, description, start_date, end_date, candidates, start_time, end_time } = createElectionDto;

    const election = this.electionRepository.create({
      title,
      description,
      start_date: start_date,
      end_date: end_date,
      vote_id: randomUUID(),
      start_time: start_time,
      end_time: end_time,
      created_by: adminId,
      status: ElectionStatus.ONGOING,
    });

    const savedElection = await this.electionRepository.save(election);

    const candidateEntities: Candidate[] = candidates.map(name => {
      const candidate = new Candidate();
      candidate.name = name;
      candidate.election = savedElection;
      return candidate;
    });

    savedElection.candidates = await this.candidateRepository.save(candidateEntities);

    return {
      status_code: HttpStatus.CREATED,
      message: SYS_MSG.ELECTION_CREATED,
      data: {
        election_id: savedElection.id,
        title: savedElection.title,
        description: savedElection.description,
        start_date: savedElection.start_date,
        end_date: savedElection.end_date,
        status: savedElection.status,
        start_time: savedElection.start_time,
        end_time: savedElection.end_time,
        vote_id: savedElection.vote_id,
        created_by: savedElection.created_by,
        candidates: savedElection.candidates.map(candidate => candidate.name),
      },
    };
  }

  async findAll(
    page: number,
    pageSize: number,
    adminId: string,
  ): Promise<{
    status_code: number;
    message: string;
    data: {
      current_page: number;
      total_pages: number;
      total_results: number;
      elections;
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
      throw new Error('Invalid pagination parameters. Page and pageSize must be greater than 0.');
    }
    const skip = (page - 1) * pageSize;

    const [result, total] = await this.electionRepository.findAndCount({
      where: adminId ? { created_by: adminId } : {},
      skip,
      take: pageSize,
      relations: ['created_by_user', 'candidates', 'votes'],
    });

    const data = this.mapElections(result);
    const total_pages = Math.ceil(total / pageSize);

    return {
      status_code: HttpStatus.OK,
      message: SYS_MSG.FETCH_ELECTIONS,
      data: {
        current_page: page,
        total_pages,
        total_results: total,
        elections: data,
        meta: {
          hasNext: page < total_pages,
          total,
          nextPage: page < total_pages ? page + 1 : null,
          prevPage: page > 1 ? page - 1 : null,
        },
      },
    };
  }

  async findOne(electionId: string): Promise<{
    status_code: number;
    message: string;
    data: {
      election: {
        election_id: string;
        title: string;
        description: string;
        votes_casted: number;
        status: string;
        start_date: Date;
        start_time: string;
        vote_id: string;
        end_date: Date;
        end_time: string;
        candidates: { candidate_id: string; name: string; vote_count: number }[];
      };
    };
  }> {
    const [election, candidates, votes] = await Promise.all([
      this.electionRepository.findOne({ where: { id: electionId } }),
      this.candidateRepository.find({ where: { election_id: electionId } }),
      this.voteRepository.find({ where: { election_id: electionId } }),
    ]);

    if (!election) {
      throw new NotFoundException({
        status_code: HttpStatus.NOT_FOUND,
        message: SYS_MSG.ELECTION_NOT_FOUND,
        data: null,
      });
    }

    const candidateMap = new Map(candidates.map(c => [c.id, c.name]));

    const voteCounts = new Map<string, number>();
    votes.forEach(vote => {
      if (Array.isArray(vote.candidate_id)) {
        vote.candidate_id.forEach(id => {
          voteCounts.set(id, (voteCounts.get(id) || 0) + 1);
        });
      } else {
        voteCounts.set(vote.candidate_id, (voteCounts.get(vote.candidate_id) || 0) + 1);
      }
    });

    const totalVotesCast = Array.from(voteCounts.values()).reduce((sum, count) => sum + count, 0);

    const result = candidates.map(candidate => ({
      candidate_id: candidate.id,
      name: candidate.name,
      vote_count: voteCounts.get(candidate.id) || 0,
    }));

    return {
      status_code: HttpStatus.OK,
      message: SYS_MSG.FETCH_ELECTION,
      data: {
        election: {
          election_id: election.id,
          title: election.title,
          vote_id: election.vote_id,
          description: election.description,
          votes_casted: totalVotesCast,
          start_date: election.start_date,
          status: election.status,
          start_time: election.start_time,
          end_date: election.end_date,
          end_time: election.end_time,
          candidates: result,
        },
      },
    };
  }

  async update(id: string, updateElectionDto: UpdateElectionDto): Promise<Election> {
    const { title, description, start_date, end_date, start_time, end_time } = updateElectionDto;

    const election = await this.electionRepository.findOne({ where: { id } });

    if (!election) {
      throw new NotFoundException({
        status_code: HttpStatus.NOT_FOUND,
        message: SYS_MSG.ELECTION_NOT_FOUND,
        data: null,
      });
    }

    if (start_date && end_date) {
      if (new Date(start_date) >= new Date(end_date)) {
        throw new BadRequestException(SYS_MSG.ELECTION_START_DATE_BEFORE_END_DATE);
      }
    }

    if (start_time && end_time) {
      const startTime = new Date(`1970-01-01T${start_time}`);
      const endTime = new Date(`1970-02-01T${end_time}`);
      if (startTime >= endTime) {
        throw new BadRequestException(SYS_MSG.ELECTION_START_TIME_BEFORE_END_TIME);
      }
    }

    Object.assign(election, {
      title: title ?? election.title,
      description: description ?? election.description,
      start_date: start_date ?? election.start_date,
      end_date: end_date ?? election.end_date,
      start_time: start_time ?? election.start_time,
      end_time: end_time ?? election.end_time,
    });

    return this.electionRepository.save(election);
  }

  async remove(id: string, adminId: string) {
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
    // TODO
    // if (election.status === ElectionStatus.ONGOING) {
    //   throw new ForbiddenException({
    //     status_code: HttpStatus.FORBIDDEN,
    //     message: SYS_MSG.ELECTION_ACTIVE_CANNOT_DELETE,
    //     data: null,
    //   });
    // }

    if (election.created_by !== adminId) {
      throw new ForbiddenException({
        status_code: HttpStatus.FORBIDDEN,
        message: SYS_MSG.UNAUTHORIZED_ACCESS,
        data: null,
      });
    }

    try {
      await this.candidateRepository.delete({ election: { id } });

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

  async getElectionByVoterLink(vote_id: string) {
    if (!isUUID(vote_id)) {
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
      where: { vote_id: vote_id },
      relations: ['candidates'],
    });

    if (!election) {
      throw new NotFoundException({
        status_code: HttpStatus.NOT_FOUND,
        message: SYS_MSG.ELECTION_NOT_FOUND,
        data: null,
      });
    }

    if (election.status === ElectionStatus.UPCOMING) {
      throw new ForbiddenException({
        status_code: HttpStatus.FORBIDDEN,
        message: SYS_MSG.ELECTION_HAS_NOT_STARTED,
        data: null,
      });
    }

    if (election.status === ElectionStatus.COMPLETED) {
      throw new NotFoundException({
        status_code: HttpStatus.NOT_FOUND,
        message: SYS_MSG.ELECTION_HAS_ENDED,
        data: null,
      });
    }

    // TODO
    // if (election?.status === ElectionStatus.COMPLETED) {
    //   throw new HttpException(
    //     {
    //       status_code: HttpStatus.FORBIDDEN,
    //       message: SYS_MSG.ELECTION_ENDED_VOTE_NOT_ALLOWED,
    //       data: null,
    //     },
    //     HttpStatus.FORBIDDEN,
    //   );
    // }

    const mappedELection = this.transformElectionResponse(election);

    return {
      status_code: HttpStatus.OK,
      message: SYS_MSG.FETCH_ELECTION_BY_VOTER_LINK,
      data: mappedELection,
    };
  }

  private mapElections(result: Election[]) {
    return result.map(election => {
      if (!election.created_by) {
        console.warn(`Admin for election with ID ${election.id} not found.`);
        return null;
      }

      // TODO
      // let electionType: ElectionType;
      // if (election.type === 'singlechoice') {
      //   electionType = ElectionType.SINGLECHOICE;
      // } else if (election.type === 'multichoice') {
      //   electionType = ElectionType.MULTICHOICE;
      // } else {
      //   console.warn(`Unknown election type "${election.type}" for election with ID ${election.id}.`);
      //   electionType = ElectionType.SINGLECHOICE;
      // }

      return {
        election_id: election.id,
        title: election.title,
        start_date: election.start_date,
        end_date: election.end_date,
        vote_id: election.vote_id,
        status: election.status,
        start_time: election.start_time,
        end_time: election.end_time,
        created_by: election.created_by,
      };
    });
  }

  private mergeDateTime(date, time) {
    console.log(date, time);

    return new Date(`${date}T${time}`);
  }

  private extract_present_time() {
    return new Date().toLocaleTimeString().split(' ')[0];
  }

  private extract_date(date_obj) {
    const date = new Date(date_obj);

    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }

    return date.toISOString().split('T')[0];
  }

  private extract_present_date() {
    return new Date().toISOString().split('T')[0];
  }

  private transformElectionResponse(election: any): any {
    if (!election) {
      return null;
    }

    //TODO
    // let electionType: ElectionType;
    // if (election.type === 'singlechoice') {
    //   electionType = ElectionType.SINGLECHOICE;
    // } else if (election.type === 'multichoice') {
    //   electionType = ElectionType.MULTICHOICE;
    // } else {
    //   console.warn(`Unknown election type "${election.type}" for election with ID ${election.id}.`);
    //   electionType = ElectionType.SINGLECHOICE;
    // }

    return {
      election_id: election.id,
      title: election.title,
      description: election.description,
      start_date: election.start_date,
      end_date: election.end_date,
      vote_id: election.vote_link,
      start_time: election.start_time,
      status: election.status,
      end_time: election.end_time,
      created_by: election.created_by,
      candidates:
        election.candidates.map(candidate => ({
          candidate_id: candidate.id,
          name: candidate.name,
        })) || [],
    };
  }

  async getElectionResults(electionId: string, adminId: string): Promise<ElectionResultsDto> {
    if (!isUUID(electionId)) {
      throw new HttpException(
        { status_code: HttpStatus.BAD_REQUEST, message: SYS_MSG.INCORRECT_UUID, data: null },
        HttpStatus.BAD_REQUEST,
      );
    }

    if (!isUUID(adminId)) {
      throw new HttpException(
        { status_code: HttpStatus.BAD_REQUEST, message: SYS_MSG.INCORRECT_UUID, data: null },
        HttpStatus.BAD_REQUEST,
      );
    }

    const election = await this.electionRepository.findOne({
      where: { id: electionId },
      relations: ['candidates', 'votes'],
    });

    if (!election) {
      throw new NotFoundException({
        status_code: HttpStatus.NOT_FOUND,
        message: SYS_MSG.ELECTION_NOT_FOUND,
        data: null,
      });
    }

    if (election.created_by !== adminId) {
      throw new ForbiddenException({
        status_code: HttpStatus.FORBIDDEN,
        message: SYS_MSG.UNAUTHORIZED_ACCESS,
        data: null,
      });
    }

    const voteCounts = new Map<string, number>();
    election.candidates.forEach(candidate => {
      voteCounts.set(candidate.id, 0);
    });

    election.votes.forEach(vote => {
      vote.candidate_id.forEach(candidateId => {
        if (voteCounts.has(candidateId)) {
          voteCounts.set(candidateId, (voteCounts.get(candidateId) || 0) + 1);
        }
      });
    });

    const results = election.candidates.map(candidate => ({
      candidate_id: candidate.id,
      name: candidate.name,
      votes: voteCounts.get(candidate.id) || 0,
    }));

    return {
      status_code: HttpStatus.OK,
      message: 'Election results retrieved successfully',
      data: {
        election_id: election.id,
        title: election.title,
        total_votes: election.votes.length,
        results: results,
      },
    };
  }

  async getElectionResultsForDownload(
    electionId: string,
    adminId: string,
  ): Promise<{ filename: string; csvData: string }> {
    const results = await this.getElectionResults(electionId, adminId);

    const csvData = this.convertResultsToCsv(results.data.results);
    const filename = `election-${electionId}-results.csv`;

    return { filename, csvData };
  }

  private convertResultsToCsv(results: Array<{ name: string; votes: number }>): string {
    const header = 'Candidate Name,Votes\n';
    const rows = results.map(r => `"${r.name.replace(/"/g, '""')}",${r.votes}`).join('\n');
    return header + rows;
  }
}
