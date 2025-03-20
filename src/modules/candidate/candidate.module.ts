import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Candidate } from './entities/candidate.entity';
import { CandidateService } from './candidate.service';
import { CandidateController } from './candidate.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Candidate])], // Register the repository
  controllers: [CandidateController],
  providers: [CandidateService],
})
export class CandidateModule {}
