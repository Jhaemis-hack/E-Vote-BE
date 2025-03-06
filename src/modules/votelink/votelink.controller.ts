import { Controller, Get, Post, Body, Patch, Param, Delete, Query, NotFoundException, UseGuards } from '@nestjs/common';
import { AdminGuard } from 'src/guards/admin.guard';
import { VoteLinkService } from './votelink.service';
import { CreateVoteLinkDto } from './dto/create-votelink.dto';
import { UpdateVoteLinkDto } from './dto/update-votelink.dto';
import { GetVoteLinkDto } from './dto/get-votelink.dto';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { VoteLinkResponseDto } from './dto/VoteLinkResponse.dto';
import { AuthGuard } from 'src/guards/auth.guard';

@ApiTags('votelink') // Add a tag name for Swagger grouping
@Controller('/votelink')
export class VoteLinkController {
  constructor(private readonly voteLinkService: VoteLinkService) {}

  @Post()
  @UseGuards(AuthGuard, AdminGuard)
  @ApiOperation({ summary: 'Create a voter link to invite users to vote' })
  @ApiResponse({
    status: 201,
    description: 'Successfully created a vote link',
    type: VoteLinkResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Election with id not found' })
  create(@Body() createVoteLinkDto: CreateVoteLinkDto) {
    return this.voteLinkService.create(createVoteLinkDto);
  }

  @Get('/elections/:id/voting-links')
  @UseGuards(AuthGuard, AdminGuard)
  @ApiOperation({ summary: 'Get voting links for an election' })
  @ApiResponse({
    status: 200,
    description: 'List of voting links for the election',
    type: [VoteLinkResponseDto],
  })
  @ApiResponse({ status: 404, description: 'Invalid Election ID' })
  async getVotingLinks(@Param('id') election_id: string, @Query() query: GetVoteLinkDto) {
    if (!this.isValidUUID(election_id)) {
      throw new NotFoundException('Invalid Election ID');
    }
    return this.voteLinkService.findAll(election_id, query);
  }

  private isValidUUID(id: string): boolean {
    const regex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
    return regex.test(id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.voteLinkService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() update_vote_link_dto: UpdateVoteLinkDto) {
    return this.voteLinkService.update(+id, update_vote_link_dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.voteLinkService.remove(+id);
  }
}
