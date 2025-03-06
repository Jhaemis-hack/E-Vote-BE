import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeleteResult, Repository } from 'typeorm';
import { VoterLink } from './entities/votelink.entity';
import { CreateVoteLinkDto } from './dto/create-votelink.dto';
import { UpdateVoteLinkDto } from './dto/update-votelink.dto';

@Injectable()
export class VoteLinkService {
  private readonly votingLinkRepository: Repository<VoterLink>;

  create(createVoteLinkDto: CreateVoteLinkDto) {
    return 'This action adds a new votelink';
  }

  findAll() {
    return `This action returns all votelink`;
  }

  async findOne(electionId: number, linkId: number): Promise<VoterLink> {
    const election_id = electionId.toString();
    const link_id = linkId.toString();
    const voterLink = await this.votingLinkRepository.findOne({ where: { election_id, id: link_id } });
    if (!voterLink) {
      throw new NotFoundException(`Voting link with ID ${linkId} not found for election ID ${electionId}`);
    }
    return voterLink;
  }

  update(id: number, updateVoteLinkDto: UpdateVoteLinkDto) {
    return `This action updates a #${id} votelink`;
  }

  async remove(electionId: number, linkId: number): Promise<void> {
    const election_id = electionId.toString();
    const link_id = linkId.toString();
    const result: DeleteResult = await this.votingLinkRepository.delete({ election_id, id: link_id });
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
