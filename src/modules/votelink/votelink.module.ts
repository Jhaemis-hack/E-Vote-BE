import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VoteLinkController } from './votelink.controller';
import { VoteLinkService } from './votelink.service';
import { VoterLink } from './entities/votelink.entity';

@Module({
  imports: [TypeOrmModule.forFeature([VoterLink])],
  controllers: [VoteLinkController],
  providers: [VoteLinkService],
})
export class VoteLinkModule {}
