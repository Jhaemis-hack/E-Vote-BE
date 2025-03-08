import { Controller, Post, Body, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { VoteService } from './votes.service';
import { CreateVoteDto } from './dto/create-votes.dto';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import * as SYS_MSG from '../../shared/constants/systemMessages';

@ApiTags('vote')
@Controller('vote')
export class VoteController {
  constructor(private readonly voteService: VoteService) {}

  @Post(':vote_link')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Create a new vote' })
  @ApiResponse({ status: 200, description: SYS_MSG.VOTE_CREATION_MESSAGE })
  async createVote(@Param('vote_link') vote_link: string, @Body() createVoteDto: CreateVoteDto) {
    return this.voteService.createVote(vote_link, createVoteDto);
  }
}
