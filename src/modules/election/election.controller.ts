import { Body, Controller, Delete, UseGuards, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CreateElectionDto } from './dto/create-election.dto';
import { UpdateElectionDto } from './dto/update-election.dto';
import { ElectionService } from './election.service';
import { ElectionResponseDto } from './dto/election-response.dto';
import { AdminGuard } from '../../guards/admin.guard';
import { AuthGuard } from '../../guards/auth.guard';
import { Election } from './entities/election.entity';

@ApiTags()
@Controller('elections')
export class ElectionController {
  constructor(private readonly electionService: ElectionService) {}

  @ApiBearerAuth()
  @Post()
  @UseGuards(AuthGuard, AdminGuard)
  @ApiOperation({ summary: 'Create a new election' })
  @ApiResponse({ status: 201, description: 'The election has been successfully created.', type: ElectionResponseDto })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  async createElection(@Body() createElectionDto: CreateElectionDto, @Req() req: any): Promise<ElectionResponseDto> {
    const adminId = req.user.id;
    return this.electionService.create(createElectionDto, adminId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all elections' })
  @ApiResponse({ status: 200, description: 'All ', type: [ElectionResponseDto] })
  async findAll(@Query('page') page: number = 1, @Query('pageSize') pageSize: number = 10): Promise<any> {
    const result = await this.electionService.findAll(page, pageSize);
    return result;
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an election by ID' })
  @ApiResponse({ status: 200, description: 'Election found', type: Election })
  @ApiResponse({ status: 404, description: 'Election not found' })
  findOne(@Param('id') id: string) {
    return this.electionService.findOne(id);
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
