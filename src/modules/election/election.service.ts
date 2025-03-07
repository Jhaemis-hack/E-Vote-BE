import {
  ForbiddenException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as SYS_MSG from '../../shared/constants/systemMessages';
import { Vote } from '../votes/entities/votes.entity';
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
    @InjectRepository(Vote) private voteRepository: Repository<Vote>,
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
      start_time: start_time,
      end_time: end_time,
      created_by: adminId,
    });

    const savedElection = await this.electionRepository.save(election);
    console.log('Election created successfully:', savedElection);
    console.log('Election', election);

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
        end_time: savedElection.end_time,
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
      relations: ['created_by_user', 'candidates', 'votes', 'voter_links'],
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

  async findOne(electionId: string): Promise<{
    status_code: number;
    message: string;
    data: {
      id: string;
      title: string;
      description: string;
      start_date: Date;
      end_date: Date;
      election_type: ElectionType;
      created_by: string;
      total_voters: number;
      votes: { candidate: string; vote_count: number }[];
    };
  }> {
    const [election, candidates, votes] = await Promise.all([
      this.electionRepository.findOne({ where: { id: electionId } }),
      this.candidateRepository.find({ where: { election_id: electionId } }),
      this.voteRepository.find({ where: { election_id: electionId } }),
    ]);

    if (!election) {
      throw new NotFoundException(`Election not found`);
    }
    const votearray = votes.map(v => v.candidate_id).flat();
    const candidateMap = new Map(candidates.map(c => [c.id, c.name]));
    const voteCounts = votearray.reduce((acc, id) => {
      acc.set(id, (acc.get(id) || 0) + 1);
      return acc;
    }, new Map<string, number>());
    const result = Array.from(voteCounts.entries()).map(([id, count]) => ({
      candidate: candidateMap.get(id) || 'Unknown',
      vote_count: count,
    }));
    return {
      status_code: HttpStatus.OK,
      message: SYS_MSG.FETCH_ELECTION,
      data: {
        id: election.id,
        title: election.title,
        description: election.description,
        start_date: election.start_date,
        end_date: election.end_date,
        election_type: election.type,
        created_by: election.created_by,
        total_voters: votearray.length,
        votes: result,
      },
    };
  }

  update(id: number, updateElectionDto: UpdateElectionDto) {
    return updateElectionDto;
  }

  async remove(id: string) {
    const election = await this.electionRepository.findOne({
      where: { id },
      relations: ['candidates'],
    });

    if (!election) {
      throw new NotFoundException({
        status: 'Not found',
        message: 'Invalid Election Id',
        status_code: 404,
      });
    }

    if (election.status === ElectionStatus.ONGOING) {
      throw new ForbiddenException({
        status: 'Forbidden',
        message: 'Cannot delete an active election',
        status_code: 403,
      });
    }

    try {
      // Step 1: Delete candidates linked to this election
      await this.candidateRepository.delete({ election: { id } });

      // Step 2: Now delete the election
      await this.electionRepository.delete({ id });

      return {
        status: 'success',
        status_code: 200,
        message: `Election with id ${id} deleted successfully`,
      };
    } catch (error) {
      this.logger.error(`Error deleting election with id ${id}: ${error.message}`, error.stack);
      throw new InternalServerErrorException(`Internal error occurred: ${error.message}`);
    }
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
          election_type: electionType,
          created_by: election.created_by,
          candidates: election.candidates.map(candidate => candidate.name),
        };
      })
      .filter(election => election !== null);
  }
}
