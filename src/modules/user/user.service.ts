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
import { exist, string } from 'joi';
import { BadRequestError, InternalServerError, NotFoundError, UnauthorizedError } from '../../errors';
import { IsNull, Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import * as SYS_MSG from '../../shared/constants/systemMessages';
import { EmailService } from '../email/email.service';
import { CreateUserDto } from './dto/create-user.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login-user.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ForgotPasswordToken } from './entities/forgot-password.entity';
import { User } from './entities/user.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User) private userRepository: Repository<User>,
    @InjectRepository(ForgotPasswordToken) private forgotPasswordRepository: Repository<ForgotPasswordToken>,
    private jwtService: JwtService,
    private configService: ConfigService,
    private readonly mailService: EmailService,
  ) {}

  async registerAdmin(createAdminDto: CreateUserDto) {
    const { email, password } = createAdminDto;

    if (!email.match(/^\S+@\S+\.\S+$/)) {
      throw new BadRequestError(SYS_MSG.INVALID_EMAIL_FORMAT);
    }

    const existingUser = await this.userRepository.findOne({ where: { email } });
    if (existingUser) {
      throw new BadRequestError(SYS_MSG.EMAIL_IN_USE);
    }

    if (password.length < 8 || !/\d/.test(password) || !/[!@#$%^&*]/.test(password)) {
      throw new BadRequestError(SYS_MSG.INVALID_PASSWORD_FORMAT);
    }
    const hashedPassword = await bcrypt.hash(password, 10);

    const newAdmin = this.userRepository.create({
      email,
      password: hashedPassword,
      is_verified: true,
    });

    const credentials = { email: newAdmin.email, sub: newAdmin.id };
    const token = this.jwtService.sign(credentials);

    try {
      await this.mailService.sendWelcomeMail(newAdmin.email);
    } catch (err) {
      throw new InternalServerError(SYS_MSG.WELCOME_EMAIL_FAILED);
    }

    try {
      await this.mailService.sendVerificationMail(newAdmin.email, token);
    } catch (err) {
      throw new InternalServerError(SYS_MSG.EMAIL_VERIFICATION_FAILED);
    }

    await this.userRepository.save(newAdmin);

    return {
      status_code: HttpStatus.CREATED,
      message: SYS_MSG.SIGNUP_MESSAGE,
      data: { id: newAdmin.id, email: newAdmin.email },
    };
  }

  async login(payload: LoginDto) {
    const userExist = await this.userRepository.findOne({
      where: { email: payload.email },
    });

    if (!userExist) {
      throw new UnauthorizedError(SYS_MSG.EMAIL_NOT_FOUND);
    }

    const isPasswordValid = await bcrypt.compare(payload.password, userExist.password);
    if (!isPasswordValid) {
      throw new UnauthorizedError(SYS_MSG.INCORRECT_PASSWORD);
    }

    if (userExist.is_verified === false) {
      const credentials = { email: userExist.email, sub: userExist.id };
      const token = this.jwtService.sign(credentials);

      try {
        await this.mailService.sendVerificationMail(userExist.email, token);

        // Restricts the user from logging in until their email is verified
        throw new InternalServerError(SYS_MSG.EMAIL_NOT_VERIFIED);
      } catch (error) {
        throw new InternalServerError(SYS_MSG.EMAIL_VERIFICATION_FAILED);
      }
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
    const [admins, total] = await this.userRepository.findAndCount({
      where: { deleted_at: IsNull() },
      order: { created_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
      select: ['id', 'email', 'created_at'],
    });
    const total_pages = Math.ceil(total / limit);
    return {
      status_code: HttpStatus.OK,
      message: SYS_MSG.FETCH_ADMINS,
      data: {
        current_page: page,
        total_pages,
        total_results: total,
        admins,
      },
    };
  }

  async getUserById(
    id: string,
  ): Promise<{ status_code: number; message: string; data: Omit<User, 'password' | 'hashPassword'> }> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundError(SYS_MSG.USER_NOT_FOUND);
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
      throw new UnauthorizedError(SYS_MSG.UNAUTHORIZED_USER);
    }

    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundError(SYS_MSG.USER_NOT_FOUND);
    }

    if (user.id !== currentUser.sub) {
      throw new UnauthorizedError(SYS_MSG.UNAUTHORIZED_USER);
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
      throw new BadRequestError(SYS_MSG.INVALID_PASSWORD_FORMAT);
    }
  }
  private validateEmail(email: string) {
    const emailRegex = /\S+@\S+\.\S+/;
    if (!emailRegex.test(email)) {
      throw new BadRequestError(SYS_MSG.INVALID_EMAIL_FORMAT);
    }
  }

  async deactivateUser(id: string): Promise<{ status_code: number; message: string; data?: any }> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundError(SYS_MSG.USER_NOT_FOUND);
    }
    await this.userRepository.softRemove(user);
    return {
      status_code: HttpStatus.OK,
      message: SYS_MSG.DELETE_USER,
    };
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto): Promise<{ message: string; data: null }> {
    const { email } = forgotPasswordDto;

    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      throw new NotFoundError(SYS_MSG.USER_NOT_FOUND);
    }
    const resetToken = uuidv4();
    const resetTokenExpiry = new Date(Date.now() + 86400000);
    const forgotPasswordToken = this.forgotPasswordRepository.create({
      email: user.email,
      reset_token: resetToken,
      token_expiry: resetTokenExpiry,
    });

    await this.mailService.sendForgotPasswordMail(
      user.email,
      'Admin',
      `${process.env.FRONTEND_URL}/reset-password`,
      resetToken,
    );
    await this.forgotPasswordRepository.save(forgotPasswordToken);
    return {
      message: SYS_MSG.PASSWORD_RESET_LINK_SENT,
      data: null,
    };
  }

  async resetPassword(resetPassword: ResetPasswordDto): Promise<{ message: string; data: null }> {
    const { email, reset_token, password } = resetPassword;
    const resetPasswordRequestExist = await this.forgotPasswordRepository.findOne({ where: { reset_token } });

    if (!resetPasswordRequestExist) {
      throw new NotFoundError(SYS_MSG.PASSWORD_RESET_REQUEST_NOT_FOUND);
    }

    const adminExist = await this.userRepository.findOne({
      where: { email },
    });
    if (!adminExist) {
      throw new NotFoundError(SYS_MSG.USER_NOT_FOUND);
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    adminExist.password = hashedPassword;
    await this.userRepository.save(adminExist);
    await this.forgotPasswordRepository.delete({ reset_token });
    return {
      message: SYS_MSG.PASSWORD_UPDATED_SUCCESSFULLY,
      data: null,
    };
  }

  async verifyEmail(token: string) {
    try {
      const payload = this.jwtService.verify(token);
      const userId = payload.sub;
      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (!user) {
        throw new NotFoundError(SYS_MSG.USER_NOT_FOUND);
      }

      if (user.is_verified) {
        throw new BadRequestError(SYS_MSG.EMAIL_ALREADY_VERIFIED);
      }

      user.is_verified = true;
      await this.userRepository.save(user);

      return {
        status_code: HttpStatus.OK,
        message: SYS_MSG.EMAIL_VERIFICATION_SUCCESS,
        data: {
          id: user.id,
          email: user.email,
          is_verified: true,
        },
      };
    } catch (error) {
      if (error.name === 'JsonWebTokenError') {
        throw new BadRequestError(SYS_MSG.INVALID_VERIFICATION_TOKEN);
      }
      if (error.name === 'TokenExpiredError') {
        throw new BadRequestError(SYS_MSG.VERIFICATION_TOKEN_EXPIRED);
      }
      throw new InternalServerError(error);
    }
  }
}
