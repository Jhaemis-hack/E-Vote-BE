import { Injectable } from '@nestjs/common';

import { CreateVoteLinkDto } from './dto/create-votelink.dto';
import { UpdateVoteLinkDto } from './dto/update-votelink.dto';

@Injectable()
export class VoteLinkService {
  create(createVoteLinkDto: CreateVoteLinkDto) {
    return 'This action adds a new votelink';
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
