import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateUserDto } from './dto/create-user.dto';
import { User, UserType } from './entities/user.entity';
import * as bcrypt from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';
import { UpdateUserDto } from './dto/update-user.dto';
import { LoginDto } from './dto/login-user.dto';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User) private userRepository: Repository<User>,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async registerAdmin(createAdminDto: CreateUserDto) {
    const { email, password, user_type, first_name, last_name } = createAdminDto;

    // Ensure only admins can register
    if (user_type !== UserType.Admin) {
      throw new BadRequestException('Only admins can be registered here.');
    }

    // Validate email format
    if (!email.match(/^\S+@\S+\.\S+$/)) {
      throw new BadRequestException('Invalid email format');
    }

    // Check if email is already in use
    const existingUser = await this.userRepository.findOne({ where: { email } });
    if (existingUser) {
      throw new BadRequestException('Email already in use');
    }

    // Validate password strength
    if (password.length < 8 || !/\d/.test(password) || !/[!@#$%^&*]/.test(password)) {
      throw new BadRequestException(
        'Password must be at least 8 characters long and include a number and special character',
      );
    }

    const newAdmin = this.userRepository.create({
      email,
      password,
      user_type,
      last_name,
      first_name,
    });

    await this.userRepository.save(newAdmin);

    const credentials = { email: newAdmin.email, sub: newAdmin.id, user_type: newAdmin.user_type };
    const token = this.jwtService.sign(credentials);
    return {
      message: 'Admin registered successfully',
      data: { email: newAdmin.email, user_type: newAdmin.user_type },
      token,
    };
  }

  async login(payload: LoginDto) {
    const userExist = await this.userRepository.findOne({
      where: { email: payload.email },
    });

    if (!userExist) {
      throw new BadRequestException('Bad credentials.');
    }

    const isPasswordValid = bcrypt.compare(payload.password, userExist.password);
    if (!isPasswordValid) {
      throw new BadRequestException('Bad credentials');
    }

    const { password, ...result } = userExist;
    const credentials = { email: userExist.email, sub: userExist.id, user_type: userExist.user_type };
    const token = this.jwtService.sign(credentials);
    return { message: 'Successfully logged in', result, token };
  }

  async getAllUsers(page: number, limit: number) {
    const [messages, total] = await this.userRepository.findAndCount({
      order: { created_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
      select: ['id', 'email', 'first_name', 'last_name', 'user_type', 'created_at'],
    });
    const totalPages = Math.ceil(total / limit);
    return {
      status: 'success',
      message: 'Retrieved users successfully',
      data: {
        currentPage: page,
        totalPages,
        totalResults: total,
        messages,
      },
    };
  }

  findOne(id: number) {
    return `This action returns a #${id} user`;
  }

  update(id: number, updateUserDto: UpdateUserDto) {
    return `This action updates a #${id} user`;
  }

  remove(id: string) {
    return `This action removes a #${id} user`;
  }

  async deactivateUser(id: string): Promise<{ message: string }> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    await this.userRepository.softRemove(user);
    return { message: `User with ID ${id} has been deactivated` };
  }
}
