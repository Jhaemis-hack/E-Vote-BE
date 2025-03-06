import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
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
  findAll() {
    return this.userService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.userService.findOne(+id);
  }

  @Patch(':id')
  @UseGuards(AuthGuard)
  async update(@Param('id') id: string, @Body() updateData: UpdateUserDto, @req() req: any) {
    const currentUser = req.user;
    return this.userService.update(id, updateData, currentUser);
  }

  @Delete(':id')
  @UseGuards(AuthGuard, AdminGuard)
  deactivateUser(@Param('id') id: string) {
    return this.userService.deactivateUser(id);
  }
}
function req(): (target: UserController, propertyKey: 'update', parameterIndex: 2) => void {
  throw new Error('Function not implemented.');
}
