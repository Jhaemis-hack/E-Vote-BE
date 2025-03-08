import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { isUUID } from 'class-validator';
import { AuthGuard } from '../../guards/auth.guard';
import { CreateElectionDto } from './dto/create-election.dto';
import { ElectionResponseDto } from './dto/election-response.dto';
import { UpdateElectionDto } from './dto/update-election.dto';
import { ElectionService } from './election.service';
import { Election } from './entities/election.entity';

import * as SYS_MSG from '../../shared/constants/systemMessages';

@ApiTags()
@Controller('elections')
export class ElectionController {
  constructor(private readonly electionService: ElectionService) {}

  @ApiBearerAuth()
  @Post()
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Create a new election' })
  @ApiResponse({ status: 201, description: 'The election has been successfully created.', type: ElectionResponseDto })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  async createElection(@Body() createElectionDto: CreateElectionDto, @Req() req: any): Promise<ElectionResponseDto> {
    const adminId = req.user.sub;
    return this.electionService.create(createElectionDto, adminId);
  }

  @ApiBearerAuth()
  @Get()
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Get all elections' })
  @ApiResponse({ status: 200, description: 'All ', type: [ElectionResponseDto] })
  async findAll(
    @Query('page') page: number = 1,
    @Query('pageSize') pageSize: number = 10,
    @Req() req: any,
  ): Promise<any> {
    const adminId = req.user.sub;
    return this.electionService.findAll(page, pageSize, adminId);
  }

  @Get(':id')
  @UseGuards(AuthGuard)
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
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Delete Inactive Election' })
  @ApiResponse({ status: 200, description: 'Election deleted successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'Not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  remove(@Param('id') id: string, @Req() req: any) {
    if (!isUUID(id)) {
      throw new HttpException('Bad Request', HttpStatus.NOT_ACCEPTABLE);
    }

    return this.electionService.remove(id);
  }

  @Get('vote/:voteLink')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get an election from vote link' })
  @ApiResponse({ status: 200, description: SYS_MSG.FETCH_ELECTION_BY_VOTER_LINK })
  @ApiResponse({ status: 400, description: SYS_MSG.INCORRECT_UUID })
  @ApiResponse({ status: 403, description: SYS_MSG.ELECTION_ENDED_VOTE_NOT_ALLOWED })
  @ApiResponse({ status: 404, description: SYS_MSG.ELECTION_NOT_FOUND })
  getElectionByVoterLink(@Param('voteLink') voteLink: string) {
    return this.electionService.getElectionByVoterLink(voteLink);
  }
}
