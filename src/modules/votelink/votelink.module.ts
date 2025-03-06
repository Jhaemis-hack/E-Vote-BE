import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VoteLinkController } from './votelink.controller';
import { VoteLinkService } from './votelink.service';
import { VoteLink } from './entities/votelink.entity';
import { Election } from '../election/entities/election.entity';
import { UserModule } from '../user/user.module';

@Module({
  imports: [TypeOrmModule.forFeature([VoteLink, Election]), UserModule],
  controllers: [VoteLinkController],
  providers: [VoteLinkService],
})
export class VoteLinkModule {}
