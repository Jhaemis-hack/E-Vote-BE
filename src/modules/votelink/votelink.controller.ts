import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { VoteLinkService } from './votelink.service';
import { CreateVoteLinkDto } from './dto/create-votelink.dto';
import { UpdateVoteLinkDto } from './dto/update-votelink.dto';

@Controller('votelink')
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
