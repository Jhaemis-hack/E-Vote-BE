import { Controller, Get, Post, Body, Patch, Param, Delete, Query, NotFoundException, UseGuards } from '@nestjs/common';
import { AdminGuard } from 'src/guards/admin.guard';
import { VoteLinkService } from './votelink.service';
import { CreateVoteLinkDto } from './dto/create-votelink.dto';
import { UpdateVoteLinkDto } from './dto/update-votelink.dto';
import { GetVoteLinkDto } from './dto/get-votelink.dto';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { VoteLinkResponseDto } from './dto/VoteLinkResponse.dto';


@ApiTags()
@Controller('/votelink')
export class VoteLinkController {
  constructor(private readonly vote_link_service: VoteLinkService) {}

  @Post()
  create(@Body() create_vote_link_dto: CreateVoteLinkDto) {
    return this.vote_link_service.create(create_vote_link_dto);
  @ApiOperation({ summary: 'Create a voter link to invite users to vote' })
  @ApiResponse({ status: 201, description: 'successfully created a vote link', type: [VoteLinkResponseDto] })
  @ApiResponse({ status: 404, description: 'Election with id not found' })
  create(@Body() createVoteLinkDto: CreateVoteLinkDto) {
    return this.voteLinkService.create(createVoteLinkDto);
  }

  @Get('/elections/:id/voting-links')
  @UseGuards(AdminGuard)
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
