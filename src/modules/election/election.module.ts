import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ElectionService } from './election.service';
import { ElectionController } from './election.controller';
import { Election } from './entities/election.entity';
import { Candidate } from '../candidate/entities/candidate.entity';
import { UserModule } from '../user/user.module';
import { Vote } from '../votes/entities/votes.entity';
import { ElectionStatusUpdaterService } from 'src/schedule-tasks/election-status-updater.service';
import { Voter } from '../voter/entities/voter.entity';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [TypeOrmModule.forFeature([Election, Candidate, Vote, Voter]), UserModule, EmailModule],
  controllers: [ElectionController],
  providers: [ElectionService, ElectionStatusUpdaterService],
})
export class ElectionModule {}
