import { Module } from '@nestjs/common';
import { VoteLinkController } from './votelink.controller';
import { VoteLinkService } from './votelink.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VoteLink } from './entities/votelink.entity';
import { Election } from '../election/entities/election.entity';

@Module({
  imports: [TypeOrmModule.forFeature([VoteLink, Election])],
  controllers: [VoteLinkController],
  providers: [VoteLinkService],
})
export class VoteLinkModule {}
