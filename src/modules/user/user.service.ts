import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { omit } from 'lodash';
import { IsNull, Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import {
  BadRequestError,
  ForbiddenError,
  InternalServerError,
  NotAcceptableError,
  NotFoundError,
  UnauthorizedError,
} from '../../errors';
import * as SYS_MSG from '../../shared/constants/systemMessages';
import { EmailService } from '../email/email.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login-user.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ForgotPasswordToken } from './entities/forgot-password.entity';
import { User } from './entities/user.entity';

import { createClient } from '@supabase/supabase-js';
import * as path from 'path';

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

    try {
      await this.mailService.sendWelcomeMail(newAdmin.email);
    } catch {
      return {
        status_code: HttpStatus.INTERNAL_SERVER_ERROR,
        message: SYS_MSG.WELCOME_EMAIL_FAILED,
        data: null,
      };
    }

    //TODO
    // const credentials = { email: newAdmin.email, sub: newAdmin.id };
    // const token = this.jwtService.sign(credentials);
    // try {
    //   await this.mailService.sendVerificationMail(newAdmin.email, token);
    // } catch {
    //   throw new InternalServerError(SYS_MSG.EMAIL_VERIFICATION_FAILED);
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
      throw new UnauthorizedError(SYS_MSG.EMAIL_NOT_FOUND);
    }

    const isPasswordValid = await bcrypt.compare(payload.password, userExist.password);
    if (!isPasswordValid) {
      throw new UnauthorizedError(SYS_MSG.INCORRECT_PASSWORD);
    }

    // TODO
    // if (userExist.is_verified === false) {
    //   const credentials = { email: userExist.email, sub: userExist.id };
    //   const token = this.jwtService.sign(credentials);

    //   try {
    //     await this.mailService.sendVerificationMail(userExist.email, token);

    // Restricts the user from logging in until their email is verified
    //     throw new InternalServerError(SYS_MSG.EMAIL_NOT_VERIFIED);
    //   } catch {
    //     throw new InternalServerError(SYS_MSG.EMAIL_VERIFICATION_FAILED);
    //   }
    // }

    const { password: _, ...admin } = userExist; // Destructure to exclude password
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
      throw new NotFoundError(SYS_MSG.USER_NOT_FOUND);
    }

    const elections = user.created_elections.filter(
      election => election.status === ElectionStatus.ONGOING || election.status === ElectionStatus.UPCOMING,
    );
    const { password: _, created_elections: __, ...rest } = user;
    Object.assign(rest, { active_elections: elections.length });
    return {
      status_code: HttpStatus.OK,
      message: SYS_MSG.FETCH_USER,
      data: rest,
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

  private validateFirstName(first_name: string): void {
    if (typeof first_name !== 'string' || first_name.trim().length === 0) {
      throw new BadRequestError(SYS_MSG.INVALID_FIRST_NAME);
    }

    if (first_name.trim().length < 2) {
      throw new BadRequestError(SYS_MSG.FIRST_NAME_TOO_SHORT);
    }

    if (first_name.trim().length > 50) {
      throw new BadRequestError(SYS_MSG.FIRST_NAME_TOO_LONG);
    }

    const allowedCharacters = /^[A-Za-z\s]+$/;
    if (!allowedCharacters.test(first_name)) {
      throw new BadRequestError(SYS_MSG.FIRST_NAME_INVALID_CHARACTERS);
    }
  }

  private validateLastName(last_name: string): void {
    if (typeof last_name !== 'string' || last_name.trim().length === 0) {
      throw new BadRequestError(SYS_MSG.INVALID_LAST_NAME);
    }

    if (last_name.trim().length < 2) {
      throw new BadRequestError(SYS_MSG.LAST_NAME_TOO_SHORT);
    }

    if (last_name.trim().length > 50) {
      throw new BadRequestError(SYS_MSG.LAST_NAME_TOO_LONG);
    }

    const allowedCharacters = /^[A-Za-z\s]+$/;
    if (!allowedCharacters.test(last_name)) {
      throw new BadRequestError(SYS_MSG.LAST_NAME_INVALID_CHARACTERS);
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

  async changePassword(
    changePassword: ChangePasswordDto,
    adminEmail: string,
  ): Promise<{ status_code: Number; message: string; data: null }> {
    const { old_password, new_password } = changePassword;

    const password = new_password.toLowerCase();

    const admin_exist = await this.userRepository.findOne({ where: { email: adminEmail } });

    if (!admin_exist) {
      throw new ForbiddenError(SYS_MSG.USER_NOT_FOUND);
    }

    const isVerifiedPassword = await bcrypt.compare(old_password, admin_exist.password);

    if (!isVerifiedPassword) {
      throw new UnauthorizedError(SYS_MSG.INCORRECT_PASSWORD);
    }

    if (password.length < 8 || !/\d/.test(password) || !/[!@#$%^&*]/.test(password)) {
      throw new BadRequestError(SYS_MSG.INVALID_PASSWORD_FORMAT);
    }

    const same_password = await bcrypt.compare(password, admin_exist.password);

    if (same_password) {
      throw new NotAcceptableError(SYS_MSG.NEW_PASSWORD_MUST_BE_UNIQUE);
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

  async updatePayment(userId: string, updatePaymentDto: UpdatePaymentDto): Promise<{ message: string; data: User }> {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundError(SYS_MSG.ADMIN_NOT_FOUND, `User with ID ${userId} not found`);
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
      throw new NotFoundError(`Admin with ID ${admin_id} not found`);
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
      throw new BadRequestError(SYS_MSG.INVALID_FILE_TYPE);
    }
    const maxSize = 1 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new BadRequestError(SYS_MSG.PHOTO_SIZE_LIMIT);
    }
    const { buffer, originalname, mimetype } = file;
    const fileExt = path.extname(originalname);
    const fileName = `${Date.now()}${fileExt}`;
    const { error } = await this.supabase.storage
      .from(this.bucketName)
      .upload(`resolve-vote/${fileName}`, buffer, { contentType: mimetype });
    if (error) {
      console.error('Supabase upload error:', error);
      throw new InternalServerError(SYS_MSG.FAILED_PHOTO_UPLOAD);
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
