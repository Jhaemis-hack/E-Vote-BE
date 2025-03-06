import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VoterLink } from './entities/votelink.entity';
import { CreateVoteLinkDto } from './dto/create-votelink.dto';
import { UpdateVoteLinkDto } from './dto/update-votelink.dto';

@Injectable()
export class VoteLinkService {
  constructor(
    @InjectRepository(VoterLink)
    private readonly votingLinkRepository: Repository<VoterLink>,
  ) {}

  create(createVoteLinkDto: CreateVoteLinkDto) {
    return 'This action adds a new votelink';
  }

  findAll() {
    return `This action returns all votelink`;
  }

  // NACHO: Get voting link by electionId and linkId
  async findOne(electionId: number, linkId: number): Promise<VoterLink> {
    const election_id = electionId.toString();
    const link_id = linkId.toString();
    const voterLink = await this.votingLinkRepository.findOne({ where: { election_id, id: link_id } });
    if (!voterLink) {
      throw new Error('VoterLink not found');
    }
    return voterLink;
  }

  update(id: number, updateVoteLinkDto: UpdateVoteLinkDto) {
    return `This action updates a #${id} votelink`;
  }

  remove(id: number) {
    return `This action removes a #${id} votelink`;
  }

  // NACHO: Check voting link status by electionId and linkId
  async checkVotingLinkStatus(electionId: number, linkId: number): Promise<any> {
    // Implement the logic to check the status of the voting link
    // This is just a placeholder implementation
    const votingLink = await this.findOne(electionId, linkId);
    if (!votingLink) {
      throw new Error('Voting link not found');
    }

    // return {
    //   status: votingLink.used ? 'used' : 'unused',
    //   timestamp: votingLink.used ? votingLink.timestamp : null,
    // };
  }
}
