import { Module } from '@nestjs/common';
import { VoterController } from './voter.controller';
import { VoterService } from './voter.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Election } from '../election/entities/election.entity';
import { Voter } from './entities/voter.entity';
import { UserModule } from '../user/user.module';
import { ElectionModule } from '../election/election.module';

@Module({
  imports: [TypeOrmModule.forFeature([Voter, Election]), UserModule, ElectionModule],
  controllers: [VoterController],
  providers: [VoterService],
  exports: [VoterService],
})
export class VoterModule {}
