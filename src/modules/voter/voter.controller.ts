import {
  Controller,
  Get,
  UseInterceptors,
  Post,
  Query,
  Req,
  Param,
  UploadedFile,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { Express } from 'express';
import { VoterService } from './voter.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { AuthGuard } from '../../guards/auth.guard';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { ApiFile } from './dto/upload-file.schema';
import {
  DuplicateEmailsErrorDto,
  VoterUploadErrorDto,
  VoterUploadLimitErrorDto,
  VoterUploadResponseDto,
} from './dto/upload-response.dto';

@Controller('voters')
export class VoterController {
  constructor(private readonly voterService: VoterService) {}

  @ApiBearerAuth()
  @Get('/:electionId/voters')
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

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Upload voters via CSV or Excel file' })
  @ApiConsumes('multipart/form-data')
  @ApiFile()
  @ApiResponse({
    status: 201,
    description: 'Voters uploaded successfully',
    type: VoterUploadResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid file format',
    type: VoterUploadErrorDto,
  })
  @ApiResponse({
    status: 400,
    description:
      'Your plan does not support the number of voters you try to upload, upgrade your plan to increase number of allowed voters.',
    type: VoterUploadLimitErrorDto,
  })
  @ApiResponse({
    status: 409,
    description: 'duplicate emails found',
    type: DuplicateEmailsErrorDto,
  })
  @Post('/:electionId/uploads')
  @UseGuards(AuthGuard)
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  async uploadVoters(
    @UploadedFile() file: Express.Multer.File,
    @Param('electionId') electionId: string,
    @Req() req: any,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded.');
    }
    const adminId = req.user.sub;
    return this.voterService.processFile(file, electionId, adminId);
  }
}
