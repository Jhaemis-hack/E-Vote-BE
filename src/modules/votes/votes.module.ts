import { Module } from '@nestjs/common';
import { VoteController } from './votes.controller';
import { VoteService } from './votes.service';

@Module({
  controllers: [VoteController],
  providers: [VoteService],
})
export class VoteModule {}
