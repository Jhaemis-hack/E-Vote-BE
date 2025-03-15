import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Voter } from './entities/voter.entity';
import { Repository } from 'typeorm';
import * as SYS_MSG from '../../shared/constants/systemMessages';

@Injectable()
export class VoterService {
  private readonly logger = new Logger(VoterService.name);
  constructor(@InjectRepository(Voter) private voterRepository: Repository<Voter>) {}

  // async findAllVoters(page: number, limit: number) {
  //   const [messages, total] = await this.voterRepository.findAndCount({
  //     order: { created_at: 'DESC' },
  //     skip: (page - 1) * limit,
  //     take: limit,
  //     select: ['id', 'email', 'created_at'],
  //   });
  //   const total_pages = Math.ceil(total / limit);
  //   return {
  //     status: 'success',
  //     message: 'Retrieved voters successfully',
  //     data: {
  //       current_page: page,
  //       total_pages,
  //       total_results: total,
  //       messages,
  //     },
  //   };
  // }

  // Get all voters without pagination
  async findAllVoters() {
    const voters = await this.voterRepository.find({
      // order: { created_at: 'DESC' },
      // select: ['id', 'email', 'created_at', 'election'],
    });

    return {
      status_code: HttpStatus.OK,
      message: SYS_MSG.RETRIEVED_VOTERS_SUCCESSFULLY,
      data: voters,
    };
  }
}
