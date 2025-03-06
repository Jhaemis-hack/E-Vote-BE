import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VoterLink } from './entities/votelink.entity';
import { Election } from '../election/entities/election.entity';
import { CreateVoteLinkDto } from './dto/create-votelink.dto';
import { UpdateVoteLinkDto } from './dto/update-votelink.dto';
import { GetVoteLinkDto } from './dto/get-votelink.dto';
import { v4 as uuidv4 } from 'uuid';
import { HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';


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
    @InjectRepository(VoteLink) private voteLinkRepository: Repository<VoteLink>,
    @InjectRepository(Election) private electionRespository: Repository<Election>,
  ) {}
  async create(createVoteLinkDto: CreateVoteLinkDto) {
    const { election_id } = createVoteLinkDto;

    const election = await this.electionRespository.findOne({ where: { id: election_id } });

    if (!election) {
      throw new NotFoundException(`Election with id ${election_id} not found`);
    }

    const unique_link = `${process.env.APP_URL}/vote/${randomUUID()}`;

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
