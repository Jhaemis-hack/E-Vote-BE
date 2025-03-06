import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ElectionService } from './election.service';
import { ElectionController } from './election.controller';
import { Election } from './entities/election.entity';
import { Candidate } from '../candidate/entities/candidate.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Election, Candidate])],
  controllers: [ElectionController],
  providers: [ElectionService],
})
export class ElectionModule {}
