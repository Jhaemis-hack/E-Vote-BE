import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateElectionDto } from './dto/create-election.dto';

import { ElectionResponseDto, ElectionType } from './dto/election-response.dto';
import { UpdateElectionDto } from './dto/update-election.dto';
import { Election } from './entities/election.entity';

@Injectable()
export class ElectionService {
  constructor(@InjectRepository(Election) private electionRepository: Repository<Election>) {}
  create(createElectionDto: CreateElectionDto) {
    return createElectionDto;
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
      relations: ['created_by'],
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

  findOne(id: number) {
    return `This action returns a #${id} election`;
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
        };
      })
      .filter(election => election !== null);
  }
}
