import { Injectable } from '@nestjs/common';
import { CreateElectionDto } from './dto/create-election.dto';
import { UpdateElectionDto } from './dto/update-election.dto';

@Injectable()
export class ElectionService {
  create(createElectionDto: CreateElectionDto) {
    return createElectionDto;
  }

  findAll() {
    return `This action returns all election`;
  }

  findOne(id: number) {
    return `This action returns a #${id} election`;
  }

  update(id: number, updateElectionDto: UpdateElectionDto) {
    return updateElectionDto;
  }

  remove(id: number) {
    return `This action removes a #${id} election`;
  }
}
