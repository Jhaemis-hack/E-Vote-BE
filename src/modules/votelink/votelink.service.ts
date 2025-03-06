import { HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { Repository, DeleteResult } from 'typeorm';
import { Election } from '../election/entities/election.entity';
import { CreateVoteLinkDto } from './dto/create-votelink.dto';
import { GetVoteLinkDto } from './dto/get-votelink.dto';
import { UpdateVoteLinkDto } from './dto/update-votelink.dto';
import { VoteLink } from './entities/votelink.entity';

@Injectable()
export class VoteLinkService {
  constructor(
    @InjectRepository(Election)
    private readonly electionRepository: Repository<Election>,

    @InjectRepository(VoteLink)
    private readonly voterLinkRepository: Repository<VoteLink>,
  ) {}

  async create(createVoteLinkDto: CreateVoteLinkDto) {
    const { election_id } = createVoteLinkDto;

    const election = await this.electionRepository.findOne({ where: { id: election_id } });

    if (!election) {
      throw new NotFoundException(`Election with id ${election_id} not found`);
    }

    const unique_link = `${process.env.APP_URL}/vote/${randomUUID()}`;

    const voteLink = this.voterLinkRepository.create({
      election,
      election_id,
      unique_link,
    });

    await this.voterLinkRepository.save(voteLink);

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

    const election = await this.electionRepository.findOne({ where: { id: election_id } });
    if (!election) {
      throw new NotFoundException('Election not found');
    }

    const [voter_links, total] = await this.voterLinkRepository.findAndCount({
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

  async findOne(electionId: number, linkId: number): Promise<VoteLink> {
    const election_id = electionId.toString();
    const link_id = linkId.toString();
    const voterLink = await this.voterLinkRepository.findOne({ where: { election_id, id: link_id } });
    if (!voterLink) {
      throw new NotFoundException(`Voting link with ID ${linkId} not found for election ID ${electionId}`);
    }
    return voterLink;
  }

  // update(id: number, updateVoteLinkDto: UpdateVoteLinkDto) {
  //   return `This action updates a #${id} votelink`;
  // }

  async remove(electionId: number, linkId: number): Promise<void> {
    const election_id = electionId.toString();
    const link_id = linkId.toString();
    const result: DeleteResult = await this.voterLinkRepository.delete({ election_id, id: link_id });
    if (result.affected === 0) {
      throw new NotFoundException(`Voting link with ID ${linkId} not found for election ID ${electionId}`);
    }
  }

  // async checkVotingLinkStatus(electionId: number, linkId: number): Promise<any> {
  //   const votingLink = await this.findOne(electionId, linkId);
  //   if (!votingLink) {
  //     throw new NotFoundException(`Voting link with ID ${linkId} not found for election ID ${electionId}`);
  //   }
  // }
}
