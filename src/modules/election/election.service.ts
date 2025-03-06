import { HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateElectionDto } from './dto/create-election.dto';
import { ElectionResponseDto, ElectionType } from './dto/election-response.dto';
import { UpdateElectionDto } from './dto/update-election.dto';
import { Election, ElectionStatus } from './entities/election.entity';
import { Candidate } from '../candidate/entities/candidate.entity';

@Injectable()
export class ElectionService {
  constructor(
    @InjectRepository(Election) private electionRepository: Repository<Election>,
    @InjectRepository(Candidate) private candidateRepository: Repository<Candidate>,
  ) {}

  async create(createElectionDto: CreateElectionDto, adminId: string): Promise<ElectionResponseDto> {
    const { title, description, startDate, endDate, electionType, candidates } = createElectionDto;

    // Create a new election instance.
    const election = this.electionRepository.create({
      title,
      description,
      start_date: startDate,
      end_date: endDate,
      status: ElectionStatus.ONGOING,
      type: electionType,
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
      election_id: savedElection.id,
      election_title: savedElection.title,
      description: savedElection.description,
      start_date: savedElection.start_date,
      end_date: savedElection.end_date,
      election_type: savedElection.type === 'single choice' ? ElectionType.SINGLE_CHOICE : ElectionType.MULTIPLE_CHOICE,
      created_by: savedElection.created_by,
      candidates: savedElection.candidates.map(candidate => candidate.name),
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
      message: 'Successfully fetched elections',
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

  async findOne(id: string): Promise<Election> {
    const election = await this.electionRepository.findOne({
      where: { id },
      relations: ['candidates'],
    });
    if (!election) {
      throw new NotFoundException('Election not found');
    }

    return election;
  }

  update(id: number, updateElectionDto: UpdateElectionDto) {
    return updateElectionDto;
  }

  remove(id: number) {
    return `This action removes a #${id} election`;
  }

  private mapElections(result: Election[]): ElectionResponseDto[] {
    return result
      .map(election => {
        if (!election.created_by) {
          console.warn(`Admin for election with ID ${election.id} not found.`);
          return null;
        }

        let electionType: ElectionType;
        if (election.type === 'single choice') {
          electionType = ElectionType.SINGLE_CHOICE;
        } else if (election.type === 'multiple choice') {
          electionType = ElectionType.MULTIPLE_CHOICE;
        } else {
          console.warn(`Unknown election type "${election.type}" for election with ID ${election.id}.`);
          electionType = ElectionType.SINGLE_CHOICE;
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
