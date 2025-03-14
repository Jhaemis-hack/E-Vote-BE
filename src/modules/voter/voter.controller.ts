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
} from '@nestjs/common';
import { Express } from 'express';
import { VoterService } from './voter.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { AuthGuard } from '../../guards/auth.guard';
import { ApiBearerAuth, ApiConsumes, ApiOperation } from '@nestjs/swagger';
import { ApiFile } from './dto/upload-file.schema';

@Controller('voters')
export class VoterController {
  constructor(private readonly voterService: VoterService) {}

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Upload voters via CSV or Excel file' })
  @ApiConsumes('multipart/form-data')
  @ApiFile()
  @Post('/:electionId/uploads')
  @UseGuards(AuthGuard)
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  async uploadVoters(@UploadedFile() file: Express.Multer.File, @Param('electionId') electionId: string) {
    if (!file) {
      throw new BadRequestException('No file uploaded.');
    }

    return this.voterService.processFile(file, electionId);
  }
}
