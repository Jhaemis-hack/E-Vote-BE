import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ElectionModule } from '../election/election.module';
import { Election } from '../election/entities/election.entity';
import { EmailModule } from '../email/email.module';
import { UserModule } from '../user/user.module';
import { Voter } from './entities/voter.entity';
import { VoterController } from './voter.controller';
import { VoterService } from './voter.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Voter, Election]),
    forwardRef(() => UserModule),
    forwardRef(() => EmailModule),
    forwardRef(() => ElectionModule),
  ],
  controllers: [VoterController],
  providers: [VoterService],
  exports: [VoterService, TypeOrmModule],
})
export class VoterModule {}
