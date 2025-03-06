import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query } from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { LoginDto } from './dto/login-user.dto';
import { AuthGuard } from 'src/guards/auth.guard';
import { AdminGuard } from 'src/guards/admin.guard';
@Controller('auth')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post('/signup')
  create(@Body() createUserDto: CreateUserDto) {
    return this.userService.registerAdmin(createUserDto);
  }

  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    const { result: user } = await this.userService.login(loginDto);
    const accessToken = await this.userService.accessToken(user);
    return { accessToken, user };
  }

  @Get()
  async getUsers(@Query('page') page: number = 1, @Query('limit') limit: number = 10) {
    return this.userService.getAllUsers(page, limit);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.userService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.userService.update(+id, updateUserDto);
  }

  @Delete(':id')
  @UseGuards(AuthGuard, AdminGuard)
  deactivateUser(@Param('id') id: string) {
    return this.userService.deactivateUser(id);
  }
}
