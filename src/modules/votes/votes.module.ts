import { Module } from '@nestjs/common';
import { VoteController } from './votes.controller';
import { VoteService } from './votes.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Vote } from './entities/votes.entity';
import { Election } from '../election/entities/election.entity';
import { Voter } from '../voter/entities/voter.entity';
@Module({
  imports: [TypeOrmModule.forFeature([Vote, Election, Voter])],
  controllers: [VoteController],
  providers: [VoteService],
})
export class VoteModule {}
