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
import { exist, string } from 'joi';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User) private userRepository: Repository<User>,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async registerAdmin(createAdminDto: CreateUserDto) {
    const { email, password } = createAdminDto;

    if (!email.match(/^\S+@\S+\.\S+$/)) {
      throw new BadRequestException(SYS_MSG.INVALID_EMAIL_FORMAT);
    }

    const existingUser = await this.userRepository.findOne({ where: { email } });
    if (existingUser) {
      throw new BadRequestException(SYS_MSG.EMAIL_IN_USE);
    }

    if (password.length < 8 || !/\d/.test(password) || !/[!@#$%^&*]/.test(password)) {
      throw new BadRequestException(SYS_MSG.INVALID_PASSWORD_FORMAT);
    }
    const hashedPassword = await bcrypt.hash(password, 10);

    const newAdmin = this.userRepository.create({
      email,
      password: hashedPassword,
      is_verified: false,
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
      throw new UnauthorizedException(SYS_MSG.EMAIL_NOT_FOUND);
    }

    if (userExist.is_verified === false) {
      throw new UnauthorizedException(SYS_MSG.EMAIL_NOT_VERIFIED);
    }

    const isPasswordValid = await bcrypt.compare(payload.password, userExist.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException(SYS_MSG.INCORRECT_PASSWORD);
    }

    const { password, ...admin } = userExist;
    const credentials = { email: userExist.email, sub: userExist.id };
    const token = this.jwtService.sign(credentials);
    return {
      status_code: HttpStatus.OK,
      message: SYS_MSG.LOGIN_MESSAGE,
      data: {
        id: admin.id,
        email: admin.email,
        token,
      },
    };
  }

  async getAllUsers(page: number, limit: number) {
    const [messages, total] = await this.userRepository.findAndCount({
      order: { created_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
      select: ['id', 'email', 'created_at'],
    });
    const total_pages = Math.ceil(total / limit);
    return {
      status: 'success',
      message: 'Retrieved users successfully',
      data: {
        current_page: page,
        total_pages,
        total_results: total,
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

    const { password, ...userData } = user;
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

    if (user.id !== currentUser.sub) {
      throw new UnauthorizedException({
        message: SYS_MSG.UNAUTHORIZED_USER,
        status_code: HttpStatus.FORBIDDEN,
      });
    }

    if (updateUserDto.password) {
      this.validatePassword(updateUserDto.password);
      updateUserDto.password = await bcrypt.hash(updateUserDto.password, 10);
    }

    if (updateUserDto.email) {
      this.validateEmail(updateUserDto.email);
      user.email = updateUserDto.email;
    }

    Object.assign(user, updateUserDto);
    await this.userRepository.save(user);

    return {
      status_code: HttpStatus.OK,
      message: SYS_MSG.USER_UPDATED,
      data: {
        user_id: user.id,
      },
    };
  }

  private validatePassword(password: string) {
    if (password.length < 8 || !/\d/.test(password) || !/[!@#$%^&*]/.test(password)) {
      throw new BadRequestException({
        message: SYS_MSG.INVALID_PASSWORD_FORMAT,
        data: {
          password: 'Password must be at least 8 characters long and contain at least one special character and number',
        },
        status_code: HttpStatus.BAD_REQUEST,
      });
    }
  }
  private validateEmail(email: string) {
    const emailRegex = /\S+@\S+\.\S+/;
    if (!emailRegex.test(email)) {
      throw new BadRequestException({
        message: SYS_MSG.INVALID_EMAIL_FORMAT,
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

  async verifyEmail(token: string) {
    try {
      // Verify the JWT token
      const payload = this.jwtService.verify(token);

      // Extract the user ID from the payload
      const userId = payload.sub;

      // Find the user by ID
      const user = await this.userRepository.findOne({ where: { id: userId } });

      if (!user) {
        throw new NotFoundException(SYS_MSG.USER_NOT_FOUND);
      }

      // If the user is already verified, return appropriate message
      if (user.is_verified) {
        return {
          status_code: HttpStatus.OK,
          message: SYS_MSG.EMAIL_ALREADY_VERIFIED,
          data: {
            ...user,
            password: undefined,
            is_verified: true,
          },
        };
      }

      // Update the user's verification status
      user.is_verified = true;
      await this.userRepository.save(user);

      // Return success response
      return {
        status_code: HttpStatus.OK,
        message: SYS_MSG.EMAIL_VERIFICATION_SUCCESS,
        data: {
          ...user,
          password: undefined,
          is_verified: true,
        },
      };
    } catch (error) {
      if (error.name === 'JsonWebTokenError') {
        throw new BadRequestException({
          message: SYS_MSG.INVALID_VERIFICATION_TOKEN,
          status_code: HttpStatus.BAD_REQUEST,
        });
      }
      if (error.name === 'TokenExpiredError') {
        throw new BadRequestException({
          message: SYS_MSG.VERIFICATION_TOKEN_EXPIRED,
          status_code: HttpStatus.BAD_REQUEST,
        });
      }
      throw error;
    }
  }
}
