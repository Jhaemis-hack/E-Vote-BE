import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { VoteLinkService } from './votelink.service';
import { CreateVoteLinkDto } from './dto/create-votelink.dto';
import { UpdateVoteLinkDto } from './dto/update-votelink.dto';

@Controller('elections/:id/votelink')
export class VoteLinkController {
  constructor(private readonly voteLinkService: VoteLinkService) {}

  @Post()
  create(@Body() createVoteLinkDto: CreateVoteLinkDto) {
    return this.voteLinkService.create(createVoteLinkDto);
  }

  @Get()
  findAll() {
    return this.voteLinkService.findAll();
  }

  // NACHO: Get voting link by electionId and linkId
  @Get(':linkId')
  findOne(@Param('id') electionId: string, @Param('linkId') linkId: string) {
    return this.voteLinkService.findOne(+electionId, +linkId);
  }

  @Patch(':linkId')
  update(@Param('id') electionId: string, @Param('linkId') linkId: string, @Body() updateUserDto: UpdateVoteLinkDto) {
    return this.voteLinkService.update(+electionId, updateUserDto);
  }

  @Delete(':linkId')
  remove(@Param('id') electionId: string, @Param('linkId') linkId: string) {
    return this.voteLinkService.remove(+electionId, +linkId);
  }

  // NACHO: Check voting link status by electionId and linkId
  // @Get(':linkId/status')
  // checkVotingLinkStatus(@Param('id') electionId: string, @Param('linkId') linkId: string) {
  //   return this.voteLinkService.checkVotingLinkStatus(+electionId, +linkId);
  // }
}
