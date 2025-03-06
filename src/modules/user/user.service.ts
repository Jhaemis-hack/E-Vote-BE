import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';
import { User, UserType } from './entities/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
@Injectable()
export class UserService {
  constructor(@InjectRepository(User) private readonly userRepository: Repository<User>) {}

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

  async update(id: string, updateUserDto: UpdateUserDto, currentUser: any) {
    if (!currentUser) {
      throw new UnauthorizedException({
        message: 'Unauthorized request',
        status_code: 401,
      });
    }

    const user = await this.userRepository.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException({
        message: 'User not found',
        status_code: 404,
      });
    }

    if (updateUserDto.user_type && currentUser.user_type !== 'admin') {
      throw new ForbiddenException({
        message: 'Forbidden: Only admins can modify this field',
        status_code: 403,
      });
    }

    if (updateUserDto.password) {
      if (updateUserDto.password.length < 8) {
        throw new BadRequestException({
          message: 'Validation failed',
          errors: { password: 'Password must be at least 8 characters' },
          status_code: 400,
        });
      }
      updateUserDto.password = await bcrypt.hash(updateUserDto.password, 10);
    }

    // Validate email format
    if (updateUserDto.email && !/\S+@\S+\.\S+/.test(updateUserDto.email)) {
      throw new BadRequestException({
        message: 'Validation failed',
        errors: { email: 'Invalid email format' },
        status_code: 400,
      });
    }

    // Merge and save updated user
    Object.assign(user, updateUserDto);
    await this.userRepository.save(user);

    return { message: 'User updated successfully', data: user };
  }

  remove(id: number) {
    return `This action removes a #${id} user`;
  }
}
