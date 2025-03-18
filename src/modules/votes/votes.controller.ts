import { Controller, Post, Body, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { VoteService } from './votes.service';
import { CreateVoteDto } from './dto/create-votes.dto';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import * as SYS_MSG from '../../shared/constants/systemMessages';

@ApiTags('vote')
@Controller('votes')
export class VoteController {
  constructor(private readonly voteService: VoteService) {}

  @Post(':vote_id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Create a new vote' })
  @ApiResponse({ status: 200, description: SYS_MSG.VOTE_CREATION_MESSAGE })
  async createVote(@Param('vote_id') vote_id: string, @Body() createVoteDto: CreateVoteDto) {
    return this.voteService.createVote(vote_id, createVoteDto);
  }
}
