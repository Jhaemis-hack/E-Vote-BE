import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  InternalServerErrorException,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard } from '../../guards/auth.guard';
import * as SYS_MSG from '../../shared/constants/systemMessages';
import { NotificationSettingsDto } from '../notification/dto/notification-settings.dto';
import { CreateElectionDto } from './dto/create-election.dto';
import { ElectionResponseDto } from './dto/election-response.dto';
import { ElectionNotFound, SingleElectionResponseDto } from './dto/single-election.dto';
import { UpdateElectionDto } from './dto/update-election.dto';
import { VerifyVoterDto } from './dto/verify-voter.dto';
import { ElectionService } from './election.service';
import { Election } from './entities/election.entity';

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
  @ApiResponse({ status: 200, description: SYS_MSG.FETCH_ELECTIONS, type: [ElectionResponseDto] })
  @ApiResponse({ status: 401, description: SYS_MSG.UNAUTHORIZED_USER })
  @ApiResponse({ status: 400, description: SYS_MSG.INCORRECT_UUID })
  @ApiResponse({ status: 400, description: SYS_MSG.INCORRECT_UUID })
  @ApiQuery({ name: 'page', required: false, example: 1, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'page_size', required: false, example: 10, description: 'Number of items per page (default: 10)' })
  async findAll(
    @Query('page') page: number = 1,
    @Query('page_size') pageSize: number = 10,
    @Req() req: any,
  ): Promise<any> {
    const adminId = req.user.sub;
    return this.electionService.findAll(page, pageSize, adminId);
  }

  @ApiBearerAuth()
  @Get(':id')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Retrieve election details by ID, including candidates and their respective vote counts.' })
  @ApiResponse({ status: 200, description: 'Election found', type: SingleElectionResponseDto })
  @ApiResponse({ status: 404, description: 'Election not found', type: ElectionNotFound })
  findOne(@Param('id') id: string) {
    return this.electionService.findOne(id);
  }

  @Put(':id')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Update an election' })
  @ApiParam({ name: 'id', description: 'Election ID', type: String })
  @ApiBody({
    type: UpdateElectionDto,
    examples: {
      example1: {
        summary: 'Example request body',
        value: {
          title: 'Updated Election Title',
          description: 'This is an updated description.',
          start_date: '2025-06-01T00:00:00Z',
          end_date: '2025-06-02T00:00:00Z',
          start_time: '09:00:00',
          end_time: '10:00:00',
          candidates: ['Candidate A', 'Candidate B'],
        },
      },
    },
  })
  @ApiResponse({ status: HttpStatus.OK, description: SYS_MSG.ELECTION_UPDATED, type: Election })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: SYS_MSG.BAD_REQUEST })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: SYS_MSG.ELECTION_NOT_FOUND })
  @ApiResponse({ status: HttpStatus.INTERNAL_SERVER_ERROR, description: SYS_MSG.INTERNAL_SERVER_ERROR })
  async update(@Param('id') id: string, @Body() updateElectionDto: UpdateElectionDto) {
    try {
      const updatedElection = await this.electionService.update(id, updateElectionDto);

      return {
        status_code: HttpStatus.OK,
        message: SYS_MSG.ELECTION_UPDATED,
        data: updatedElection,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new NotFoundException({
          status_code: HttpStatus.NOT_FOUND,
          message: SYS_MSG.ELECTION_NOT_FOUND,
          data: null,
        });
      } else if (error instanceof BadRequestException) {
        throw new BadRequestException({
          status_code: HttpStatus.BAD_REQUEST,
          message: error.message || SYS_MSG.BAD_REQUEST,
          data: null,
        });
      } else {
        throw new InternalServerErrorException({
          status_code: HttpStatus.INTERNAL_SERVER_ERROR,
          message: SYS_MSG.INTERNAL_SERVER_ERROR,
          data: null,
        });
      }
    }
  }

  @Delete(':id')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Delete Inactive Election' })
  @ApiResponse({ status: 200, description: SYS_MSG.ELECTION_DELETED })
  @ApiResponse({ status: 400, description: SYS_MSG.INCORRECT_UUID })
  @ApiResponse({ status: 403, description: SYS_MSG.UNAUTHORIZED_ACCESS })
  @ApiResponse({ status: 404, description: SYS_MSG.ELECTION_NOT_FOUND })
  @ApiResponse({ status: 500, description: SYS_MSG.INTERNAL_SERVER_ERROR })
  remove(@Param('id') id: string, @Req() req: any) {
    const adminId = req.user.sub;
    return this.electionService.remove(id, adminId);
  }

  @Get('votes/:vote_id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get an election from vote link' })
  @ApiResponse({ status: 200, description: SYS_MSG.FETCH_ELECTION_BY_VOTER_LINK })
  @ApiResponse({ status: 400, description: SYS_MSG.INCORRECT_UUID })
  @ApiResponse({ status: 403, description: SYS_MSG.ELECTION_ENDED_VOTE_NOT_ALLOWED })
  @ApiResponse({ status: 404, description: SYS_MSG.ELECTION_NOT_FOUND })
  getElectionByVoterLink(@Param('vote_id', new ParseUUIDPipe()) vote_id: string) {
    return this.electionService.getElectionByVoterLink(vote_id);
  }

  @Put(':id/notification-settings')
  @ApiOperation({ summary: 'Update email notification settings for an election' })
  @ApiParam({ name: 'id', description: 'Election ID', type: String })
  @ApiBody({
    type: NotificationSettingsDto,
    examples: {
      example1: {
        summary: 'Example request body',
        value: {
          email_notification: true,
        },
      },
    },
  })
  @ApiResponse({ status: HttpStatus.OK, description: SYS_MSG.EMAIL_NOTIFICATION_UPDATED })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: SYS_MSG.INVALID_NOTIFICATION_SETTINGS })
  async updateNotificationSettings(@Param('id') id: string, @Body() settings: NotificationSettingsDto) {
    return this.electionService.updateNotificationSettings(id, settings);
  }

  @ApiBearerAuth()
  @Post('upload')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('photo'))
  @ApiOperation({ summary: 'Upload a photo' })
  @ApiResponse({ status: 200, description: SYS_MSG.FETCH_PROFILE_URL })
  @ApiResponse({ status: 401, description: SYS_MSG.UNAUTHORIZED_USER })
  @ApiResponse({ status: 400, description: SYS_MSG.BAD_REQUEST })
  @ApiResponse({ status: 500, description: SYS_MSG.FAILED_PHOTO_UPLOAD })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        photo: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  async uploadPhoto(@UploadedFile() file: Express.Multer.File, @Req() req: any) {
    const adminId = req.user.sub;
    return this.electionService.uploadPhoto(file, adminId);
  }

  @Post('voters/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify voter' })
  @ApiResponse({ status: 200, description: SYS_MSG.VOTER_VERIFIED })
  @ApiResponse({ status: 401, description: SYS_MSG.VOTER_UNVERIFIED })
  @ApiResponse({ status: 400, description: SYS_MSG.BAD_REQUEST })
  async verifyVoter(@Body() verifyVoterDto: VerifyVoterDto) {
    return this.electionService.verifyVoter(verifyVoterDto);
  }

  @Post(':id/send-reminders')
  async sendReminders(@Param('id') id: string) {
    return this.electionService.sendReminderEmails(id);
  }
}
