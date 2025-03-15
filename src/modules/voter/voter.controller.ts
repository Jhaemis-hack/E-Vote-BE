import {
  Controller,
  Get,
  UseInterceptors,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UploadedFile,
  BadRequestException,
  UseGuards,
  Query,
} from '@nestjs/common';
import { Express } from 'express';
import { VoterService } from './voter.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { AuthGuard } from '../../guards/auth.guard';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ApiFile } from './dto/upload-file.schema';
import { DuplicateEmailsErrorDto, VoterUploadErrorDto, VoterUploadResponseDto } from './dto/upload-response.dto';

@Controller('voters')
export class VoterController {
  constructor(private readonly voterService: VoterService) {}

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
    status: 409,
    description: 'duplicate emails found',
    type: DuplicateEmailsErrorDto,
  })
  @Post('/:electionId/uploads')
  @UseGuards(AuthGuard)
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  async uploadVoters(@UploadedFile() file: Express.Multer.File, @Param('electionId') electionId: string) {
    if (!file) {
      throw new BadRequestException('No file uploaded.');
    }

    return this.voterService.processFile(file, electionId);
  }

  @Get()
  async findAllVoters(@Query('page') page: number = 1, @Query('limit') limit: number = 10) {
    // return this.voterService.findAllVoters(page, limit);
    return this.voterService.findAllVoters();
  }
}
