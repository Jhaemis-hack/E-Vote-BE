import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateUserDto } from './dto/create-user.dto';
import { User, UserType } from './entities/user.entity';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User) private userRepository: Repository<User>,
    private jwtService: JwtService,
  ) {}

  async registerAdmin(createAdminDto: CreateUserDto) {
    const { email, password, user_type, first_name, last_name } = createAdminDto;

    // ✅ Ensure only admins can register
    if (user_type !== UserType.Admin) {
      throw new BadRequestException('Only admins can be registered here.');
    }

    // ✅ Validate email format
    if (!email.match(/^\S+@\S+\.\S+$/)) {
      throw new BadRequestException('Invalid email format');
    }

    // ✅ Check if email is already in use
    const existingUser = await this.userRepository.findOne({ where: { email } });
    if (existingUser) {
      throw new BadRequestException('Email already in use');
    }

    // ✅ Validate password strength
    if (password.length < 8 || !/\d/.test(password) || !/[!@#$%^&*]/.test(password)) {
      throw new BadRequestException(
        'Password must be at least 8 characters long and include a number and special character',
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newAdmin = this.userRepository.create({
      email,
      password: hashedPassword,
      user_type,
      last_name,
      first_name,
    });

    await this.userRepository.save(newAdmin);

    const payload = { email: newAdmin.email, sub: newAdmin.id, role: newAdmin.user_type };
    const token = this.jwtService.sign(payload);

    return {
      message: 'Admin registered successfully',
      data: { email: newAdmin.email, user_type: newAdmin.user_type },
      token,
    };
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
