import { Injectable } from '@nestjs/common';
import { CreateVoteDto } from './dto/create-votes.dto';
import { UpdateVoteDto } from './dto/update-votes.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Vote } from './entities/votes.entity';
import { Repository } from 'typeorm';

@Injectable()
export class VoteService {
  constructor(
    @InjectRepository(Vote)
    private readonly voteRepository: Repository<Vote>,
  ) {}

  async createVote(createUserDto: CreateVoteDto) {
    const newVote = this.voteRepository.create(createUserDto);
    const savedVote = await this.voteRepository.save(newVote);
    return {
      status: 'success',
      message: 'vote created successfully',
      data: savedVote,
    };
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
