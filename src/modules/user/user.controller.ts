import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query, HttpStatus, Req } from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { LoginDto } from './dto/login-user.dto';
import { AuthGuard } from 'src/guards/auth.guard';
import { AdminGuard } from 'src/guards/admin.guard';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { User } from './entities/user.entity';

@ApiTags('auth')
@Controller('auth')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post('/signup')
  @ApiOperation({ summary: 'Register a new admin user' })
  @ApiResponse({ status: 201, description: 'The admin user has been successfully created.', type: User })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  create(@Body() createUserDto: CreateUserDto) {
    return this.userService.registerAdmin(createUserDto);
  }

  @Post('login')
  @ApiOperation({ summary: 'Login an existing user' })
  @ApiResponse({ status: 200, description: 'The user has been successfully logged in.', type: User })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async login(@Body() loginDto: LoginDto) {
    const { result: user, message, token } = await this.userService.login(loginDto);
    return { message, token, user };
  }

  @Get('users')
  @UseGuards(AuthGuard, AdminGuard)
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

  @Get(':id')
  @ApiOperation({ summary: 'Get a user by ID' })
  @ApiResponse({ status: 200, description: 'Return the user with the given ID.', type: User })
  @ApiResponse({ status: 404, description: 'User not found.' })
  findOne(@Param('id') id: string) {
    return this.userService.findOne(+id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a user by ID' })
  @ApiResponse({ status: 200, description: 'The user has been successfully updated.', type: User })
  @ApiResponse({ status: 404, description: 'User not found.' })
  async update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto, @Req() req: any) {
    const currentUser = req.user;
    return this.userService.update(id, updateUserDto, currentUser);
  }

  @Delete(':id')
  @UseGuards(AuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Deactivate a user by ID' })
  @ApiResponse({ status: 200, description: 'The user has been successfully deactivated.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  deactivateUser(@Param('id') id: string) {
    return this.userService.deactivateUser(id);
  }
}
function req(): (target: UserController, propertyKey: 'update', parameterIndex: 2) => void {
  throw new Error('Function not implemented.');
}
