import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';

import { UpdateVoteDto } from './dto/update-votes.dto';
import { VoteService } from './votes.service';
import { CreateVoteDto } from './dto/create-votes.dto';

@Controller('vote')
export class VoteController {
  constructor(private readonly voteService: VoteService) {}

  @Post()
  async createVote(@Body() createVoteDto: CreateVoteDto) {
    return this.voteService.createVote(createVoteDto);
  }

  @Get()
  findAll() {
    return this.voteService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.voteService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateVoteDto: UpdateVoteDto) {
    return this.voteService.update(+id, updateVoteDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.voteService.remove(+id);
  }
}
