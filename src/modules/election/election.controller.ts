import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CreateElectionDto } from './dto/create-election.dto';
import { UpdateElectionDto } from './dto/update-election.dto';
import { ElectionService } from './election.service';
import { ElectionResponseDto } from './dto/election-response.dto';

@ApiTags()
@Controller('elections')
export class ElectionController {
  constructor(private readonly electionService: ElectionService) {}

  @Post()
  create(@Body() createElectionDto: CreateElectionDto) {
    return this.electionService.create(createElectionDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all elections' })
  @ApiResponse({ status: 200, description: 'All ', type: [ElectionResponseDto] })
  async findAll(@Query('page') page: number = 1, @Query('pageSize') pageSize: number = 10): Promise<any> {
    const result = await this.electionService.findAll(page, pageSize);
    return result;
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
