import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  HttpStatus,
  HttpCode,
  ParseUUIDPipe,
  UsePipes,
  ValidationPipe,
  BadRequestException,
  Req,
  UnauthorizedException,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { LoginDto } from './dto/login-user.dto';
import { AuthGuard } from '../../guards/auth.guard';
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
import { User } from './entities/user.entity';
import * as SYS_MSG from '../../shared/constants/systemMessages';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { STATUS_CODES } from 'http';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { FileInterceptor } from '@nestjs/platform-express';

@ApiTags('Auth')
@Controller('auth')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post('/signup')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new admin user' })
  @ApiResponse({ status: 201, description: 'The admin user has been successfully created.', type: User })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  create(@Body(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })) createUserDto: CreateUserDto) {
    return this.userService.registerAdmin(createUserDto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login an existing user' })
  @ApiResponse({ status: 200, description: 'The user has been successfully logged in.', type: User })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async login(@Body(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })) loginDto: LoginDto) {
    return this.userService.login(loginDto);
  }

  @Get('users')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all users' })
  @ApiQuery({ name: 'page', required: false, example: 1, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, example: 10, description: 'Number of items per page (default: 10)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successfully retrieved messages',
  })
  async getUsers(@Query('page') page: number = 1, @Query('limit') limit: number = 10) {
    return this.userService.getAllUsers(page, limit);
  }

  @Get('users/:id')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a user by ID' })
  @ApiResponse({ status: 200, description: 'Return the user with the given ID.', type: User })
  @ApiResponse({ status: 404, description: 'User not found.' })
  getUserById(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.userService.getUserById(id);
  }

  @Patch('/user/:id')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update a user by ID' })
  @ApiResponse({ status: 200, description: 'The user has been successfully updated.', type: User })
  @ApiResponse({ status: 404, description: 'User not found.' })
  async update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto, @Req() req: any) {
    if (!id.match(/^[0-9a-fA-F-]{36}$/)) {
      throw new BadRequestException({
        message: SYS_MSG.INCORRECT_UUID,
        status_code: HttpStatus.BAD_REQUEST,
      });
    }

    const currentUser = req.user;
    return this.userService.update(id, updateUserDto, currentUser);
  }

  @Delete('users/:id')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Deactivate a user by ID' })
  @ApiResponse({ status: 200, description: 'The user has been successfully deactivated.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  deactivateUser(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.userService.deactivateUser(id);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request a password reset link' })
  @ApiResponse({ status: 200, description: 'Password reset link has been sent to your email.' })
  @ApiResponse({ status: 404, description: 'User with this email does not exist.' })
  async forgotPassword(
    @Body(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
    forgotPasswordDto: ForgotPasswordDto,
  ) {
    return await this.userService.forgotPassword(forgotPasswordDto);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset user password using a valid reset token' })
  @ApiResponse({ status: 200, description: 'Admin Password Updated Successfully,please proceed to login.' })
  @ApiResponse({ status: 404, description: 'User with this email does not exist.' })
  @ApiResponse({ status: 404, description: 'Password reset request not found.' })
  async resetPasssword(
    @Body(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
    resetPasswordDto: ResetPasswordDto,
  ) {
    return await this.userService.resetPassword(resetPasswordDto);
  }

  @Get('/verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify user email' })
  @ApiQuery({ name: 'token', required: true, type: String, description: 'Verification token' })
  @ApiResponse({ status: 200, description: 'Account has been verified' })
  @ApiResponse({ status: 400, description: 'Invalid token' })
  async verifyEmail(@Query('token') token: string) {
    return this.userService.verifyEmail(token);
  }
  @Patch(':id/subscription-payment')
  @ApiOperation({ summary: 'Update user payment details' })
  @ApiParam({ name: 'id', required: true, type: String, description: 'User ID' })
  @ApiBody({ type: UpdatePaymentDto })
  @ApiResponse({ status: 200, description: 'Payment details updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid data provided' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async updateUserPayment(@Param('id') userId: string, @Body() updatePaymentDto: UpdatePaymentDto) {
    return this.userService.updatePayment(userId, updatePaymentDto);
  }

  @Post('users/photo_upload')
  @UseGuards(AuthGuard)
  @UseInterceptors(FileInterceptor('photo'))
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Upload a photo' })
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
  @ApiResponse({ status: 200, description: SYS_MSG.FETCH_PROFILE_URL })
  @ApiResponse({ status: 401, description: SYS_MSG.UNAUTHORIZED_USER })
  @ApiResponse({ status: 400, description: SYS_MSG.BAD_REQUEST })
  @ApiResponse({ status: 500, description: SYS_MSG.FAILED_PHOTO_UPLOAD })
  async profilePictureUpload(@UploadedFile() file: Express.Multer.File, @Req() req: any) {
    const admin_id = req.user.sub;
    return this.userService.uploadProfilePicture(file, admin_id);
  }
}
