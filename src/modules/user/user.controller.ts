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
} from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { LoginDto } from './dto/login-user.dto';
import { AuthGuard } from 'src/guards/auth.guard';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { User } from './entities/user.entity';
import * as SYS_MSG from '../../shared/constants/systemMessages';
import { ForgotPasswordDto } from './dto/forgot-password.dto';

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
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of users per page' })
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
}
