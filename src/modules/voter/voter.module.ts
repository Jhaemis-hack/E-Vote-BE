import { Module } from '@nestjs/common';
import { VoterController } from './voter.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Voter } from './entities/voter.entity';
import { VoterService } from './voter.service';

@Module({
  imports: [TypeOrmModule.forFeature([Voter])],
  controllers: [VoterController],
  providers: [VoterService],
})
export class VoterModule {}
