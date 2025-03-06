import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { LoginDto } from './dto/login-user.dto';
@Controller('auth')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post('/signup')
  create(@Body() createUserDto: CreateUserDto) {
    return this.userService.registerAdmin(createUserDto);
  }
  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    const user = await this.userService.login(loginDto);
    const accessToken = await this.userService.accessToken(user);
    return { accessToken, user };
  }

  @Get()
  findAll() {
    return this.userService.findAll();
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
  remove(@Param('id') id: string) {
    return this.userService.remove(+id);
  }
}
