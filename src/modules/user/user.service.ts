import {
  BadRequestException,
  HttpException,
  // ForbiddenException,
  HttpStatus,
  Injectable,
  NotAcceptableException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { IsNull, Repository, In } from 'typeorm';
import * as SYS_MSG from '../../shared/constants/systemMessages';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginDto } from './dto/login-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';
import { EmailService } from '../email/email.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ForgotPasswordToken } from './entities/forgot-password.entity';
import { v4 as uuidv4 } from 'uuid';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { omit } from 'lodash';

import * as path from 'path';
import { createClient } from '@supabase/supabase-js';

import { ElectionStatus } from '../election/entities/election.entity';

@Injectable()
export class UserService {
  private readonly supabase;
  private readonly bucketName = process.env.SUPABASE_BUCKET;
  constructor(
    @InjectRepository(User) private userRepository: Repository<User>,
    @InjectRepository(ForgotPasswordToken) private forgotPasswordRepository: Repository<ForgotPasswordToken>,
    private jwtService: JwtService,
    private configService: ConfigService,
    private readonly mailService: EmailService,
  ) {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY || !process.env.SUPABASE_BUCKET) {
      throw new Error('Supabase environment variables are not set.');
    }
    this.supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
    this.bucketName = process.env.SUPABASE_BUCKET;
  }

  async registerAdmin(createAdminDto: CreateUserDto) {
    const { email: rawEmail, password } = createAdminDto;
    const email = rawEmail.toLowerCase();

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
      is_verified: true,
    });

    // const credentials = { email: newAdmin.email, sub: newAdmin.id };
    // const token = this.jwtService.sign(credentials);

    try {
      await this.mailService.sendWelcomeMail(newAdmin.email);
    } catch {
      return {
        status_code: HttpStatus.INTERNAL_SERVER_ERROR,
        message: SYS_MSG.WELCOME_EMAIL_FAILED,
        data: null,
      };
    }

    // TODO
    // try {
    //   await this.mailService.sendVerificationMail(newAdmin.email, token);
    // } catch (err) {
    //   return {
    //     status_code: HttpStatus.INTERNAL_SERVER_ERROR,
    //     message: SYS_MSG.EMAIL_VERIFICATION_FAILED,
    //     data: null,
    //   };
    // }

    await this.userRepository.save(newAdmin);

    return {
      status_code: HttpStatus.CREATED,
      message: SYS_MSG.SIGNUP_MESSAGE,
      data: { id: newAdmin.id, email: newAdmin.email },
    };
  }

  async login(payload: LoginDto) {
    const userExist = await this.userRepository.findOne({
      where: { email: payload.email.toLowerCase() },
    });

    if (!userExist) {
      throw new UnauthorizedException(SYS_MSG.EMAIL_NOT_FOUND);
    }

    const isPasswordValid = await bcrypt.compare(payload.password, userExist.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException(SYS_MSG.INCORRECT_PASSWORD);
    }

    // TODO
    // if (userExist.is_verified === false) {
    //   const credentials = { email: userExist.email, sub: userExist.id };
    //   const token = this.jwtService.sign(credentials);

    //   try {
    //     await this.mailService.sendVerificationMail(userExist.email, token);

    //     // Restricts the user from logging in until their email is verified
    //     return {
    //       status_code: HttpStatus.FORBIDDEN,
    //       message: SYS_MSG.EMAIL_NOT_VERIFIED,
    //       data: null,
    //     };
    //   } catch (error) {
    //     return {
    //       status_code: HttpStatus.INTERNAL_SERVER_ERROR,
    //       message: SYS_MSG.EMAIL_VERIFICATION_FAILED,
    //       data: null,
    //     };
    //   }
    // }

    const { password, ...admin } = userExist; // Destructure to exclude password
    const credentials = { email: admin.email, sub: admin.id };
    const token = this.jwtService.sign(credentials);

    return {
      status_code: HttpStatus.OK,
      message: SYS_MSG.LOGIN_MESSAGE,
      data: {
        id: admin.id,
        email: admin.email,
        first_name: admin.first_name,
        last_name: admin.last_name,
        is_verified: admin.is_verified,
        google_id: admin.google_id,
        profile_picture: admin.profile_picture,
        billing_interval: admin.billing_Interval,
        plan: admin.plan,
        created_elections: admin.created_elections,
        subscriptions: admin.subscriptions,
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

  async getUserById(id: string): Promise<{
    status_code: number;
    message: string;
    data: Omit<User, 'password' | 'hashPassword' | 'created_elections'>;
  }> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['created_elections'],
    });
    if (!user) {
      throw new NotFoundException(SYS_MSG.USER_NOT_FOUND);
    }

    const elections = user.created_elections.filter(
      election => election.status === ElectionStatus.ONGOING || election.status === ElectionStatus.UPCOMING,
    );
    const { password, created_elections, ...rest } = user;
    Object.assign(rest, { active_elections: elections.length });

    return {
      status_code: HttpStatus.OK,
      message: SYS_MSG.FETCH_USER,
      data: rest,
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

    if (updateUserDto.first_name) {
      this.validateFirstName(updateUserDto.first_name);
      user.first_name = updateUserDto.first_name;
    }

    if (updateUserDto.last_name) {
      this.validateLastName(updateUserDto.last_name);
      user.last_name = updateUserDto.last_name;
    }

    if (updateUserDto.email) {
      this.validateEmail(updateUserDto.email);
      user.email = updateUserDto.email;
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

  private validateFirstName(first_name: string): void {
    if (typeof first_name !== 'string' || first_name.trim().length === 0) {
      throw new BadRequestException({
        status_code: HttpStatus.BAD_REQUEST,
        message: SYS_MSG.INVALID_FIRST_NAME,
        data: null,
      });
    }

    if (first_name.trim().length < 2) {
      throw new BadRequestException({
        status_code: HttpStatus.BAD_REQUEST,
        message: SYS_MSG.FIRST_NAME_TOO_SHORT,
        data: null,
      });
    }

    if (first_name.trim().length > 50) {
      throw new BadRequestException({
        status_code: HttpStatus.BAD_REQUEST,
        message: SYS_MSG.FIRST_NAME_TOO_LONG,
        data: null,
      });
    }

    const allowedCharacters = /^[A-Za-z\s]+$/;
    if (!allowedCharacters.test(first_name)) {
      throw new BadRequestException({
        status_code: HttpStatus.BAD_REQUEST,
        message: SYS_MSG.FIRST_NAME_INVALID_CHARACTERS,
        data: null,
      });
    }
  }

  private validateLastName(last_name: string): void {
    if (typeof last_name !== 'string' || last_name.trim().length === 0) {
      throw new BadRequestException({
        status_code: HttpStatus.BAD_REQUEST,
        message: SYS_MSG.INVALID_LAST_NAME,
        data: null,
      });
    }

    if (last_name.trim().length < 2) {
      throw new BadRequestException({
        status_code: HttpStatus.BAD_REQUEST,
        message: SYS_MSG.LAST_NAME_TOO_SHORT,
        data: null,
      });
    }

    if (last_name.trim().length > 50) {
      throw new BadRequestException({
        status_code: HttpStatus.BAD_REQUEST,
        message: SYS_MSG.LAST_NAME_TOO_LONG,
        data: null,
      });
    }

    const allowedCharacters = /^[A-Za-z\s]+$/;
    if (!allowedCharacters.test(last_name)) {
      throw new BadRequestException({
        status_code: HttpStatus.BAD_REQUEST,
        message: SYS_MSG.LAST_NAME_INVALID_CHARACTERS,
        data: null,
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

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto): Promise<{ message: string; data: null }> {
    const { email } = forgotPasswordDto;

    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      throw new NotFoundException({
        status_code: HttpStatus.NOT_FOUND,
        message: SYS_MSG.USER_NOT_FOUND,
      });
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
      user.email,
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
      throw new NotFoundException({
        status_code: HttpStatus.NOT_FOUND,
        message: SYS_MSG.PASSWORD_RESET_REQUEST_NOT_FOUND,
      });
    }

    const adminExist = await this.userRepository.findOne({
      where: { email },
    });
    if (!adminExist) {
      throw new NotFoundException({
        status_code: HttpStatus.NOT_FOUND,
        message: SYS_MSG.USER_NOT_FOUND,
      });
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

  async changePassword(
    changePassword: ChangePasswordDto,
    adminEmail: string,
  ): Promise<{ status_code: Number; message: string; data: null }> {
    const { old_password, new_password } = changePassword;

    const password = new_password.toLowerCase();

    const admin_exist = await this.userRepository.findOne({ where: { email: adminEmail } });

    if (!admin_exist) {
      throw new HttpException(
        {
          status_code: HttpStatus.FORBIDDEN,
          message: SYS_MSG.USER_NOT_FOUND,
          data: null,
        },
        HttpStatus.FORBIDDEN,
      );
    }

    const isVerifiedPassword = await bcrypt.compare(old_password, admin_exist.password);

    if (!isVerifiedPassword) {
      throw new HttpException(
        {
          status_code: HttpStatus.UNAUTHORIZED,
          message: SYS_MSG.INCORRECT_PASSWORD,
          data: null,
        },
        HttpStatus.UNAUTHORIZED,
      );
    }

    if (password.length < 8 || !/\d/.test(password) || !/[!@#$%^&*]/.test(password)) {
      throw new HttpException(
        {
          status_code: HttpStatus.BAD_REQUEST,
          message: SYS_MSG.INVALID_PASSWORD_FORMAT,
          data: null,
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const same_password = await bcrypt.compare(password, admin_exist.password);

    if (same_password) {
      throw new HttpException(
        {
          status_code: HttpStatus.NOT_ACCEPTABLE,
          message: SYS_MSG.NEW_PASSWORD_MUST_BE_UNIQUE,
          data: null,
        },
        HttpStatus.NOT_ACCEPTABLE,
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    admin_exist.password = hashedPassword;
    await this.userRepository.save(admin_exist);
    return {
      status_code: HttpStatus.CREATED,
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
        throw new NotFoundException(SYS_MSG.USER_NOT_FOUND);
      }

      if (user.is_verified) {
        throw new BadRequestException(SYS_MSG.EMAIL_ALREADY_VERIFIED);
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

  async updatePayment(userId: string, updatePaymentDto: UpdatePaymentDto): Promise<{ message: string; data: User }> {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    Object.assign(user, updatePaymentDto);
    const updatedPaymentData = await this.userRepository.save(user);
    return {
      message: SYS_MSG.SUBSCRIPTION_SUCCESSFUL,
      data: omit(updatedPaymentData, ['password']),
    };
  }

  async uploadProfilePicture(file: Express.Multer.File, admin_id: string) {
    const admin = await this.userRepository.findOne({ where: { id: admin_id } });
    if (!admin) {
      throw new NotFoundException(`Admin with ID ${admin_id} not found`);
    }
    if (!file) {
      return {
        status_code: HttpStatus.BAD_REQUEST,
        message: SYS_MSG.NO_FILE_UPLOADED,
        data: null,
      };
    }
    // Validate file type
    const allowed_mime_types = ['image/jpeg', 'image/png', 'image/jpg'];
    if (!allowed_mime_types.includes(file.mimetype)) {
      throw new HttpException(
        { status_code: HttpStatus.BAD_REQUEST, message: SYS_MSG.INVALID_FILE_TYPE, data: null },
        HttpStatus.BAD_REQUEST,
      );
    }
    const maxSize = 1 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new HttpException(
        { status_code: HttpStatus.BAD_REQUEST, message: SYS_MSG.PHOTO_SIZE_LIMIT, data: null },
        HttpStatus.BAD_REQUEST,
      );
    }
    const { buffer, originalname, mimetype } = file;
    const fileExt = path.extname(originalname);
    const fileName = `${Date.now()}${fileExt}`;
    const { error } = await this.supabase.storage
      .from(this.bucketName)
      .upload(`resolve-vote/${fileName}`, buffer, { contentType: mimetype });
    if (error) {
      console.error('Supabase upload error:', error);
      throw new HttpException(
        { status_code: HttpStatus.INTERNAL_SERVER_ERROR, message: SYS_MSG.FAILED_PHOTO_UPLOAD, data: null },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
    const { data: public_url_data } = this.supabase.storage
      .from(this.bucketName)
      .getPublicUrl(`resolve-vote/${fileName}`);
    admin.profile_picture = public_url_data.publicUrl;
    await this.userRepository.save(admin);
    return {
      status_code: HttpStatus.OK,
      message: SYS_MSG.PICTURE_UPDATED,
      data: { profile_picture: admin.profile_picture },
    };
  }
}
