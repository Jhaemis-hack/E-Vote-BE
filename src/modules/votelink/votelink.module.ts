import { Module } from '@nestjs/common';
import { VoteLinkController } from './votelink.controller';
import { VoteLinkService } from './votelink.service';

@Module({
  controllers: [VoteLinkController],
  providers: [VoteLinkService],
})
export class VoteLinkModule {}
