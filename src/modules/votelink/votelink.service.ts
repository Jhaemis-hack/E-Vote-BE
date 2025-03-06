import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VoterLink } from './entities/votelink.entity';
import { Election } from '../election/entities/election.entity';
import { CreateVoteLinkDto } from './dto/create-votelink.dto';
import { UpdateVoteLinkDto } from './dto/update-votelink.dto';
import { GetVoteLinkDto } from './dto/get-votelink.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class VoteLinkService {
  constructor(
    @InjectRepository(Election)
    private readonly election_repository: Repository<Election>,

    @InjectRepository(VoterLink)
    private readonly voter_link_repository: Repository<VoterLink>,
  ) {}

  create(create_vote_link_dto: CreateVoteLinkDto) {
    return 'This action adds a new votelink';
  }

  async findAll(election_id: string, query: GetVoteLinkDto) {
    const { page = 1, limit = 10 } = query;

    const page_number = isNaN(page) ? 1 : page;
    const limit_number = isNaN(limit) ? 10 : limit;

    const election = await this.election_repository.findOne({ where: { id: election_id } });
    if (!election) {
      throw new NotFoundException('Election not found');
    }

    const [voter_links, total] = await this.voter_link_repository.findAndCount({
      where: { election_id: election_id },
      skip: (page_number - 1) * limit_number,
      take: limit_number,
    });

    return {
      total,
      page: page_number,
      totalPages: Math.ceil(total / limit_number),
      voterLinks: voter_links,
    };
  }

  findOne(id: number) {
    return `This action returns a #${id} votelink`;
  }

  update(id: number, update_vote_link_dto: UpdateVoteLinkDto) {
    return `This action updates a #${id} votelink`;
  }

  remove(id: number) {
    return `This action removes a #${id} votelink`;
  }
}
