import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import { VoterService } from './voter.service';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { AuthGuard } from 'src/guards/auth.guard';

@Controller('voter')
export class VoterController {
  constructor(private readonly voterService: VoterService) {}

  @ApiBearerAuth()
  @Get(':electionId/voters')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: "Get Voters' List" })
  @ApiResponse({ status: 200, description: 'List of all eligible voters' })
  @ApiQuery({ name: 'page', required: false, example: 1, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'page_size', required: false, example: 10, description: 'Number of items per page (default: 10)' })
  async findAll(
    @Query('page') page: number = 1,
    @Query('page_size') pageSize: number = 10,
    @Param('electionId') electionId: string,
    @Req() req: any,
  ): Promise<any> {
    const adminId = req.user.sub;
    return this.voterService.findAll(page, pageSize, adminId, electionId);
  }
}
