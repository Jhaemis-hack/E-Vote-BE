import {
  BadRequestException,
  ForbiddenException,
  HttpStatus,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import * as SYS_MSG from '../../shared/constants/systemMessages';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginDto } from './dto/login-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User) private userRepository: Repository<User>,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async registerAdmin(createAdminDto: CreateUserDto) {
    const { email, password } = createAdminDto;

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
    });

    await this.userRepository.save(newAdmin);

    const credentials = { email: newAdmin.email, sub: newAdmin.id };
    const token = this.jwtService.sign(credentials);
    return {
      status_code: HttpStatus.CREATED,
      message: SYS_MSG.SIGNUP_MESSAGE,
      data: { id: newAdmin.id, email: newAdmin.email, token },
    };
  }

  async login(payload: LoginDto) {
    const userExist = await this.userRepository.findOne({
      where: { email: payload.email },
    });

    if (!userExist) {
      throw new BadRequestException('Bad credentials.');
    }

    const isPasswordValid = await bcrypt.compare(payload.password, userExist.password);
    if (!isPasswordValid) {
      throw new BadRequestException('Bad credentials');
    }

    const { password, ...admin } = userExist;
    const credentials = { email: userExist.email, sub: userExist.id };
    const token = this.jwtService.sign(credentials);
    return {
      status_code: HttpStatus.OK,
      message: SYS_MSG.LOGIN_MESSAGE,
      data: { id: admin.id, email: admin.email, token },
    };
  }

  async getAllUsers(page: number, limit: number) {
    const [messages, total] = await this.userRepository.findAndCount({
      order: { created_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
      select: ['id', 'email', 'created_at'],
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

  async getUserById(
    id: string,
  ): Promise<{ status_code: number; message: string; data: Omit<User, 'password' | 'hashPassword'> }> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(SYS_MSG.USER_NOT_FOUND);
    }

    const { password, hashPassword, ...userData } = user;
    return {
      status_code: HttpStatus.OK,
      message: SYS_MSG.FETCH_USER,
      data: userData,
    };
  }

  async update(id: string, updateUserDto: UpdateUserDto, currentUser: any) {
    if (!currentUser) {
      throw new UnauthorizedException({
        message: SYS_MSG.UNAUTHORIZED_USER,
        status_code: HttpStatus.UNAUTHORIZED,
      });
    }

    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException({
        message: SYS_MSG.USER_NOT_FOUND,
        status_code: HttpStatus.NOT_FOUND,
      });
    }

    if (currentUser.user_type !== 'admin' && user.id !== currentUser.id) {
      throw new UnauthorizedException({
        message: SYS_MSG.UNAUTHORIZED_USER,
        status_code: HttpStatus.FORBIDDEN,
      });
    }

    if (updateUserDto.password) {
      this.validatePassword(updateUserDto.password);
      updateUserDto.password = await bcrypt.hash(updateUserDto.password, 10);
    } else {
      delete updateUserDto.password;
    }

    if (updateUserDto.email) {
      this.validateEmail(updateUserDto.email);
    }

    Object.assign(user, updateUserDto);
    await this.userRepository.save(user);

    return {
      status_code: HttpStatus.OK,
      message: SYS_MSG.USER_UPDATED,
      data: user,
    };
  }

  private validatePassword(password: string) {
    if (password.length < 8) {
      throw new BadRequestException({
        message: SYS_MSG.VALIDATON_ERROR,
        data: { password: 'Password must be at least 8 characters long' },
        status_code: HttpStatus.BAD_REQUEST,
      });
    }
  }

  private validateEmail(email: string) {
    const emailRegex = /\S+@\S+\.\S+/;
    if (!emailRegex.test(email)) {
      throw new BadRequestException({
        message: 'Validation failed',
        data: { email: 'Invalid email format' },
        status_code: HttpStatus.BAD_REQUEST,
      });
    }
  }

  async deactivateUser(id: string): Promise<{ status_code: number; message: string; data?: any }> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(SYS_MSG.USER_NOT_FOUND);
    }
    await this.userRepository.softRemove(user);
    return {
      status_code: HttpStatus.OK,
      message: SYS_MSG.DELETE_USER,
    };
  }
}
