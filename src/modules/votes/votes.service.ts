import { Injectable } from '@nestjs/common';
import { CreateVoteDto } from './dto/create-votes.dto';
import { UpdateVoteDto } from './dto/update-votes.dto';

@Injectable()
export class VoteService {
  create(createUserDto: CreateVoteDto) {
    return 'This action adds a new vote';
  }

  findAll() {
    return `This action returns all vote`;
  }

  findOne(id: number) {
    return `This action returns a #${id} vote`;
  }

  update(id: number, UpdateVoteDto: UpdateVoteDto) {
    return `This action updates a #${id} vote`;
  }

  remove(id: number) {
    return `This action removes a #${id} vote`;
  }
}
