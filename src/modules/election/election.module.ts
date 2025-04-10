import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ElectionService } from './election.service';
import { ElectionController } from './election.controller';
import { Election } from './entities/election.entity';
import { Candidate } from '../candidate/entities/candidate.entity';
import { UserModule } from '../user/user.module';
import { Vote } from '../votes/entities/votes.entity';
import { ElectionStatusUpdaterService } from 'src/schedule-tasks/election-status-updater.service';
import { EmailModule } from '../email/email.module';
import { Voter } from '../voter/entities/voter.entity';
import { ConfigModule } from '@nestjs/config';
import { User } from '../user/entities/user.entity';
import { VoterService } from '../voter/voter.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Election, Candidate, Vote, Voter, User]),
    UserModule,
    forwardRef(() => EmailModule),
    ConfigModule,
  ],
  controllers: [ElectionController],
  providers: [ElectionService, ElectionStatusUpdaterService, VoterService],
  exports: [ElectionService],
})
export class ElectionModule {}
