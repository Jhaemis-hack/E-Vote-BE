import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateUserDto } from './dto/create-user.dto';
import { User, UserType } from './entities/user.entity';
import * as bcrypt from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';
import { UpdateUserDto } from './dto/update-user.dto';
import { LoginDto } from './dto/login-user.dto';
import { sign, Secret } from 'jsonwebtoken';
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

    const token = await this.accessToken(newAdmin);

    return {
      message: 'Admin registered successfully',
      data: { email: newAdmin.email, user_type: newAdmin.user_type },
      token,
    };
  }

  async login(payload: LoginDto) {
    const userExist = await this.userRepository.findOne({
      where: { email: payload.email },
      select: ['id', 'email', 'password', 'user_type'],
    });

    if (!userExist) {
      throw new BadRequestException('Bad credentials.');
    }

    const isPasswordValid = await bcrypt.compare(payload.password, userExist.password);
    if (!isPasswordValid) {
      throw new BadRequestException('Bad credentials');
    }

    const { password, ...result } = userExist;
    return { message: 'Successfully logged in', result };
  }

  async accessToken(user: any): Promise<string> {
    const secretKey = this.configService.get<string>('JWT_SECRET_KEY') as Secret;
    if (!secretKey) throw new NotFoundException('JWT_SECRET_KEY is not defined');
    return sign({ id: user.id, email: user.email, user_type: user.user_type }, secretKey, {
      expiresIn: '1d',
    });
  }

  findAll() {
    return 'This action returns all user';
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

    if (updateUserDto.user_type && currentUser.User_type !== 'admin') {
      throw new ForbiddenException({
        message: 'Forbidden: Only admins can modify this field',
        status_code: 403,
      });
    }

    if (updateUserDto.password) {
      if (updateUserDto.password.length > 8) {
        throw new BadRequestException({
          message: 'verification failed',
          errors: { password: 'password must be more than 8 characters' },
          status: 400,
        });
      }
      updateUserDto.password = await bcrypt.hash(updateUserDto.password, 10);
    }

    if (updateUserDto.email && !/\S+@\S+\.\S+/.test(updateUserDto.email)) {
      throw new BadRequestException({
        message: 'Validation failed',
        errors: { email: 'Invalid email format' },
        status_code: 400,
      });
    }

    Object.assign(user, updateUserDto);
    await this.userRepository.save(user);

    return { message: 'User updated successfully', data: user };
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
