import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';
import { UserType } from './entities/user.entity';
@Injectable()
export class UserService {
  async registerAdmin(createAdminDto: CreateUserDto) {
    if (createAdminDto.user_type !== UserType.Admin) {
      throw new BadRequestException('Only admins can be registered here.');
    }

    const hashedPassword = await bcrypt.hash(createAdminDto.password, 10);

    const newAdmin = {
      ...createAdminDto,
      password: hashedPassword,
    };

    return { message: 'Admin registered successfully', data: newAdmin };
  }

  findAll() {
    return `This action returns all user`;
  }

  findOne(id: number) {
    return `This action returns a #${id} user`;
  }

  update(id: number, updateUserDto: UpdateUserDto) {
    return `This action updates a #${id} user`;
  }

  remove(id: number) {
    return `This action removes a #${id} user`;
  }
}
