import { HttpStatus, Injectable, NotFoundException } from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import { Election } from '../election/entities/election.entity';
import { CreateVoteLinkDto } from './dto/create-votelink.dto';
import { UpdateVoteLinkDto } from './dto/update-votelink.dto';
import { VoteLink } from './entities/votelink.entity';

@Injectable()
export class VoteLinkService {
  constructor(
    @InjectRepository(VoteLink) private voteLinkRepository: Repository<VoteLink>,
    @InjectRepository(Election) private electionRespository: Repository<Election>,
  ) {}
  async create(createVoteLinkDto: CreateVoteLinkDto) {
    const { election_id } = createVoteLinkDto;

    const election = await this.electionRespository.findOne({ where: { id: election_id } });

    if (!election) {
      throw new NotFoundException(`Election with id ${election_id} not found`);
    }

    const unique_link = `${process.env.APP_URL}/vote/${randomUUID}`;

    const voteLink = this.voteLinkRepository.create({
      election,
      election_id,
      unique_link,
    });

    await this.voteLinkRepository.save(voteLink);

    return {
      status_code: HttpStatus.CREATED,
      message: 'Successfully created a votelink',
      data: {
        unique_link,
      },
    };
  }

  findAll() {
    return `This action returns all votelink`;
  }

  findOne(id: number) {
    return `This action returns a #${id} votelink`;
  }

  update(id: number, updateVoteLinkDto: UpdateVoteLinkDto) {
    return `This action updates a #${id} votelink`;
  }

  remove(id: number) {
    return `This action removes a #${id} votelink`;
  }
}
