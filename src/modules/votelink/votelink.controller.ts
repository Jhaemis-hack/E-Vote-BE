import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { VoteLinkService } from './votelink.service';
import { CreateVoteLinkDto } from './dto/create-votelink.dto';
import { UpdateVoteLinkDto } from './dto/update-votelink.dto';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { VoteLinkResponseDto } from './dto/VoteLinkResponse.dto';

@ApiTags()
@Controller('/votelink')
export class VoteLinkController {
  constructor(private readonly voteLinkService: VoteLinkService) {}

  @Post()
  @ApiOperation({ summary: 'Create a voter link to invite users to vote' })
  @ApiResponse({ status: 201, description: 'successfully created a vote link', type: [VoteLinkResponseDto] })
  @ApiResponse({ status: 404, description: 'Election with id not found' })
  create(@Body() createVoteLinkDto: CreateVoteLinkDto) {
    return this.voteLinkService.create(createVoteLinkDto);
  }

  @Get()
  findAll() {
    return this.voteLinkService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.voteLinkService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateVoteLinkDto) {
    return this.voteLinkService.update(+id, updateUserDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.voteLinkService.remove(+id);
  }
}
