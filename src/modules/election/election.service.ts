import { Injectable } from '@nestjs/common';
import { CreateElectionDto } from './dto/create-election.dto';
import { UpdateElectionDto } from './dto/update-election.dto';

@Injectable()
export class ElectionService {
  create(createElectionDto: CreateElectionDto) {
    return 'This action adds a new election';
  }

  findAll() {
    return `This action returns all election`;
  }

  findOne(id: number) {
    return `This action returns a #${id} election`;
  }

  update(id: number, updateElectionDto: UpdateElectionDto) {
    return `This action updates a #${id} election`;
  }

  remove(id: number) {
    return `This action removes a #${id} election`;
  }
}
