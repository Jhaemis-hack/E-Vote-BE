import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ElectionService } from './election.service';
import { CreateElectionDto } from './dto/create-election.dto';
import { UpdateElectionDto } from './dto/update-election.dto';

@Controller('election')
export class ElectionController {
  constructor(private readonly electionService: ElectionService) {}

  @Post()
  create(@Body() createElectionDto: CreateElectionDto) {
    return this.electionService.create(createElectionDto);
  }

  @Get()
  findAll() {
    return this.electionService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.electionService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateElectionDto: UpdateElectionDto) {
    return this.electionService.update(+id, updateElectionDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.electionService.remove(+id);
  }
}
