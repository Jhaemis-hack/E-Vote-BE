import { Controller, Get, Query } from '@nestjs/common';
import { VoterService } from './voter.service';

@Controller('voter')
export class VoterController {
  constructor(private readonly voterService: VoterService) {}

  @Get()
  findAllVoters(@Query('page') page: number = 1, @Query('limit') limit: number = 10) {
    // return this.voterService.findAllVoters(page, limit);
    return this.voterService.findAllVoters();
  }
}
