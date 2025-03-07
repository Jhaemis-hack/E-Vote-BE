import { Module } from '@nestjs/common';
import { VoteController } from './votes.controller';
import { VoteService } from './votes.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Vote } from './entities/votes.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Vote])],
  controllers: [VoteController],
  providers: [VoteService],
})
export class VoteModule {}
