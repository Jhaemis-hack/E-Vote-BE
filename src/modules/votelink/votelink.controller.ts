import { Controller, Get, Post, Body, Patch, Param, Delete, Query, NotFoundException } from '@nestjs/common';
import { VoteLinkService } from './votelink.service';
import { CreateVoteLinkDto } from './dto/create-votelink.dto';
import { UpdateVoteLinkDto } from './dto/update-votelink.dto';
import { GetVoteLinkDto } from './dto/get-votelink.dto';

@Controller('votelink')
export class VoteLinkController {
  constructor(private readonly vote_link_service: VoteLinkService) {}

  @Post()
  create(@Body() create_vote_link_dto: CreateVoteLinkDto) {
    return this.vote_link_service.create(create_vote_link_dto);
  }

  @Get('/elections/:id/voting-links')
  async getVotingLinks(@Param('id') election_id: string, @Query() query: GetVoteLinkDto) {
    if (!this.isValidUUID(election_id)) {
      throw new NotFoundException('Invalid Election ID');
    }
    return this.vote_link_service.findAll(election_id, query);
  }

  private isValidUUID(id: string): boolean {
    const regex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
    return regex.test(id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.vote_link_service.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() update_vote_link_dto: UpdateVoteLinkDto) {
    return this.vote_link_service.update(+id, update_vote_link_dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.vote_link_service.remove(+id);
  }
}
