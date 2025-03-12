import { BadRequestException, HttpStatus, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import { LoginDto } from '../dto/login-user.dto';
import { User } from '../entities/user.entity';
import { UserService } from '../user.service';
import { randomUUID } from 'crypto';
import * as SYS_MSG from '../../../shared/constants/systemMessages';
import { UpdateUserDto } from '../dto/update-user.dto';
import { ForgotPasswordToken } from '../entities/forgot-password.entity';
import { ForgotPasswordDto } from '../dto/forgot-password.dto';
import { EmailService } from '../../email/email.service';
import { ResetPasswordDto } from '../dto/reset-password.dto';
import { DeleteResult } from 'typeorm';

interface CreateUserDto {
  id?: string;
  email: string;
  password: string;
  is_verified: false;
}

describe('UserService', () => {
  let userService: UserService;
  let userRepository: Repository<User>;
  let jwtService: JwtService;
  let configService: ConfigService;
  let forgotPasswordRepository: Repository<ForgotPasswordToken>;
  let emailService: EmailService;

  beforeEach(async () => {
    const mockUserRepository = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      softRemove: jest.fn(),
    };

    const mockForgotPasswordTokenRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(), // Add this line
      delete: jest.fn(),
    };

    const mockJwtService = {
      sign: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn().mockReturnValue('mocked-secret-key'),
    };
    const mockEmailService = {
      sendForgotPasswordMail: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: getRepositoryToken(ForgotPasswordToken),
          useValue: mockForgotPasswordTokenRepository,
        },
        {
          provide: EmailService,
          useValue: mockEmailService,
        },
      ],
    }).compile();

    userService = module.get<UserService>(UserService);
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    jwtService = module.get<JwtService>(JwtService);
    configService = module.get<ConfigService>(ConfigService);
    forgotPasswordRepository = module.get<Repository<ForgotPasswordToken>>(getRepositoryToken(ForgotPasswordToken));
    emailService = module.get<EmailService>(EmailService);
  });

  describe('registerAdmin', () => {
    it('✅ should register an admin successfully', async () => {
      const adminDto: CreateUserDto = {
        id: randomUUID(),
        email: 'admin@example.com',
        password: 'StrongPass1!',
        is_verified: false,
      };

      userRepository.findOne = jest.fn().mockResolvedValue(null);
      const hashSpy = jest.spyOn(bcrypt, 'hash') as unknown as jest.Mock<
        ReturnType<(key: string) => Promise<string>>,
        Parameters<(key: string) => Promise<string>>
      >;
      hashSpy.mockResolvedValueOnce('hashedPassword');
      userRepository.create = jest.fn().mockReturnValue(adminDto as User);
      userRepository.save = jest.fn().mockResolvedValue(adminDto as User);
      jwtService.sign = jest.fn().mockReturnValue('mockedToken');

      const result = await userService.registerAdmin(adminDto);

      expect(result).toEqual({
        status_code: HttpStatus.CREATED,
        message: SYS_MSG.SIGNUP_MESSAGE,
        data: {
          id: adminDto.id,
          email: adminDto.email,
          token: 'mockedToken',
        },
      });
    });

    it('❌ should throw an error for an invalid email format', async () => {
      const userDto: CreateUserDto = {
        email: 'invalid-email',
        password: 'StrongPass1!',
        is_verified: false,
      };

      await expect(userService.registerAdmin(userDto)).rejects.toThrow(new BadRequestException('Invalid email format'));
    });

    it('❌ should throw an error if email is already in use', async () => {
      const userDto: CreateUserDto = {
        email: 'admin@example.com',
        password: 'StrongPass1!',
        is_verified: false,
      };

      userRepository.findOne = jest.fn().mockResolvedValue(userDto as User);

      await expect(userService.registerAdmin(userDto)).rejects.toThrow(new BadRequestException('Email already in use'));
    });

    it('❌ should throw an error for a weak password', async () => {
      const userDto: CreateUserDto = {
        email: 'admin@example.com',
        password: 'weakpass',
        is_verified: false,
      };

      userRepository.findOne = jest.fn().mockResolvedValue(null);

      await expect(userService.registerAdmin(userDto)).rejects.toThrow(
        new BadRequestException(
          'Password must be at least 8 characters long and include a number and special character',
        ),
      );
    });

    it('❌ should throw BadRequestException for password without number', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440000';
      const updateUserDto: UpdateUserDto = {
        password: 'password!',
      };
      const currentUser = {
        sub: userId,
        user_type: 'admin',
      };
      const mockUser = {
        id: userId,
        email: 'old@example.com',
        password: 'hashedPassword',
      };

      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser as any);

      await expect(userService.update(userId, updateUserDto, currentUser)).rejects.toThrow(
        new BadRequestException({
          status_code: HttpStatus.BAD_REQUEST,
          message: SYS_MSG.INVALID_PASSWORD_FORMAT,
          data: null,
        }),
      );
    });

    it('❌ should throw BadRequestException for password without special character', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440000';
      const updateUserDto: UpdateUserDto = {
        password: 'pass1234',
      };
      const currentUser = {
        sub: userId,
        user_type: 'admin',
      };
      const mockUser = {
        id: userId,
        email: 'old@example.com',
        password: 'hashedPassword',
      };

      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser as any);

      await expect(userService.update(userId, updateUserDto, currentUser)).rejects.toThrow(
        new BadRequestException({
          status_code: HttpStatus.BAD_REQUEST,
          message: SYS_MSG.INVALID_PASSWORD_FORMAT,
          data: null,
        }),
      );
    });
  });
  describe('resetPassword', () => {
    const resetPasswordDto: ResetPasswordDto = {
      email: 'test@example.com',
      reset_token: 'valid_token',
      password: 'NewPassword123!',
    };

    it('should throw NotFoundException if reset request does not exist', async () => {
      jest.spyOn(forgotPasswordRepository, 'findOne').mockResolvedValue(null);

      await expect(userService.resetPassword(resetPasswordDto)).rejects.toThrow(
        new NotFoundException({
          status_code: HttpStatus.NOT_FOUND,
          message: SYS_MSG.PASSWORD_RESET_REQUEST_NOT_FOUND,
        }),
      );

      expect(forgotPasswordRepository.findOne).toHaveBeenCalledWith({
        where: { reset_token: resetPasswordDto.reset_token },
      });
    });

    it('should throw NotFoundException if user does not exist', async () => {
      jest.spyOn(forgotPasswordRepository, 'findOne').mockResolvedValue({
        id: '1',
        email: resetPasswordDto.email,
        reset_token: resetPasswordDto.reset_token,
        token_expiry: new Date(Date.now() + 3600000), // 1 hour validity
        created_at: new Date(),
        updated_at: new Date(),
      } as ForgotPasswordToken);

      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);

      await expect(userService.resetPassword(resetPasswordDto)).rejects.toThrow(
        new NotFoundException({
          status_code: HttpStatus.NOT_FOUND,
          message: SYS_MSG.USER_NOT_FOUND,
        }),
      );

      expect(userRepository.findOne).toHaveBeenCalledWith({ where: { email: resetPasswordDto.email } });
    });
    it('should throw NotFoundException if user does not exist', async () => {
      jest.spyOn(forgotPasswordRepository, 'findOne').mockResolvedValue({
        id: '1',
        email: resetPasswordDto.email,
        reset_token: resetPasswordDto.reset_token,
        token_expiry: new Date(Date.now() + 3600000), // 1 hour validity
        created_at: new Date(),
        updated_at: new Date(),
      } as ForgotPasswordToken);

      // Simulate that the user does not exist
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);

      await expect(userService.resetPassword(resetPasswordDto)).rejects.toThrow(
        new NotFoundException({
          status_code: HttpStatus.NOT_FOUND,
          message: SYS_MSG.USER_NOT_FOUND,
        }),
      );

      expect(userRepository.findOne).toHaveBeenCalledWith({ where: { email: resetPasswordDto.email } });
    });

    it('should hash password, update user, and delete reset request on success', async () => {
      const mockUser = { id: '1', email: resetPasswordDto.email, password: 'oldHashedPassword' } as User;
      const mockResetRequest = { reset_token: resetPasswordDto.reset_token } as ForgotPasswordToken;

      jest.spyOn(forgotPasswordRepository, 'findOne').mockResolvedValue(mockResetRequest);
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);

      const hashedPassword = 'hashedPassword';
      const hashSpy = jest.spyOn(bcrypt, 'hash') as unknown as jest.Mock<
        ReturnType<(key: string) => Promise<string>>,
        Parameters<(key: string) => Promise<string>>
      >;
      hashSpy.mockResolvedValueOnce('hashedPassword');
      jest.spyOn(userRepository, 'save').mockResolvedValue({ ...mockUser, password: hashedPassword });
      jest.spyOn(forgotPasswordRepository, 'delete').mockResolvedValue({ affected: 1 } as DeleteResult);

      const result = await userService.resetPassword(resetPasswordDto);

      expect(bcrypt.hash).toHaveBeenCalledWith(resetPasswordDto.password, 10);
      expect(userRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          password: hashedPassword,
        }),
      );
      expect(forgotPasswordRepository.delete).toHaveBeenCalledWith({ reset_token: resetPasswordDto.reset_token });
      expect(result).toEqual({ message: SYS_MSG.PASSWORD_UPDATED_SUCCESSFULLY, data: null });
    });
  });

  describe('login', () => {
    it('should log in successfully with valid credentials', async () => {
      const loginDto: LoginDto = {
        email: 'user@example.com',
        password: 'CorrectPass1!',
      };

      const hashedPassword = await bcrypt.hash(loginDto.password, 10);
      const mockUser: Partial<User> = {
        id: randomUUID(),
        email: loginDto.email,
        password: hashedPassword,
      };

      userRepository.findOne = jest.fn().mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockImplementation(async () => true);
      jwtService.sign = jest.fn().mockReturnValue('mockedToken');

      const result = await userService.login(loginDto);

      expect(result).toEqual({
        status_code: HttpStatus.OK,
        message: SYS_MSG.LOGIN_MESSAGE,
        data: {
          id: mockUser.id,
          email: loginDto.email,
          token: 'mockedToken',
        },
      });
    });

    it('should throw an error if user does not exist', async () => {
      const loginDto: LoginDto = {
        email: 'nonexistent@example.com',
        password: 'WrongPass1!',
      };

      userRepository.findOne = jest.fn().mockResolvedValue(null);

      await expect(userService.login(loginDto)).rejects.toThrow(new UnauthorizedException(SYS_MSG.EMAIL_NOT_FOUND));
    });

    it('should throw an error for incorrect credentials', async () => {
      const loginDto: LoginDto = {
        email: 'user@example.com',
        password: 'WrongPass1!',
      };

      const hashedPassword = await bcrypt.hash('CorrectPass1!', 10);
      const mockUser: Partial<User> = {
        id: '1',
        email: loginDto.email,
        password: hashedPassword,
      };

      userRepository.findOne = jest.fn().mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockImplementationOnce(async () => false);

      await expect(userService.login(loginDto)).rejects.toThrow(new UnauthorizedException(SYS_MSG.INCORRECT_PASSWORD));
    });
  });

  describe('getUserById', () => {
    it('should return the user details when a valid ID is provided', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440000';
      const mockUser = {
        id: userId,
        email: 'test@example.com',
        password: 'hashedPassword',
        created_at: new Date(),
      };

      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser as any);

      const result = await userService.getUserById(userId);
      expect(result.status_code).toEqual(HttpStatus.OK);
      expect(result.data).toEqual(
        expect.objectContaining({
          id: userId,
          email: 'test@example.com',
        }),
      );
      expect(result.data).not.toHaveProperty('password');
      expect(result.data).not.toHaveProperty('hashPassword');
    });

    it('should throw a NotFoundException when the user does not exist', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);

      await expect(userService.getUserById('non-existent-uuid')).rejects.toThrow(NotFoundException);
    });
  });

  describe('deactivateUser', () => {
    it('should deactivate (soft remove) the user successfully', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440000';
      const mockUser = {
        id: userId,
        email: 'test@example.com',
        created_at: new Date(),
      };

      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser as any);
      jest.spyOn(userRepository, 'softRemove').mockResolvedValue(mockUser as any);

      const result = await userService.deactivateUser(userId);
      expect(result.status_code).toEqual(HttpStatus.OK);
      expect(result.message).toEqual(SYS_MSG.DELETE_USER);
    });

    it('should throw a NotFoundException when trying to deactivate a non-existent user', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);

      await expect(userService.deactivateUser('non-existent-uuid')).rejects.toThrow(NotFoundException);
    });
  });
  describe('update', () => {
    it('should update a user successfully', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440000';
      const updateUserDto: UpdateUserDto = {
        email: 'new@example.com',
      };
      const currentUser = {
        sub: userId,
        user_type: 'admin',
      };
      const mockUser = {
        id: userId,
        email: 'old@example.com',
      };

      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser as any);
      jest.spyOn(userRepository, 'save').mockResolvedValue({ ...mockUser, ...updateUserDto } as any);

      const result = await userService.update(userId, updateUserDto, currentUser);

      expect(result).toEqual({
        status_code: HttpStatus.OK,
        message: SYS_MSG.USER_UPDATED,
        data: { user_id: mockUser.id },
      });
    });

    it('should throw UnauthorizedException if currentUser is not provided', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440000';
      const updateUserDto: UpdateUserDto = {
        email: 'new@example.com',
      };

      await expect(userService.update(userId, updateUserDto, null)).rejects.toThrow(
        new UnauthorizedException({
          message: SYS_MSG.UNAUTHORIZED_USER,
          status_code: HttpStatus.UNAUTHORIZED,
        }),
      );
    });

    it('should throw NotFoundException if user does not exist', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440000';
      const updateUserDto: UpdateUserDto = {
        email: 'new@example.com',
      };
      const currentUser = {
        id: userId,
        user_type: 'admin',
      };

      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);

      await expect(userService.update(userId, updateUserDto, currentUser)).rejects.toThrow(
        new NotFoundException({
          message: SYS_MSG.USER_NOT_FOUND,
          status_code: HttpStatus.NOT_FOUND,
        }),
      );
    });

    it('should throw UnauthorizedException if a non-admin tries to update another user', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440000';
      const updateUserDto: UpdateUserDto = {
        email: 'new@example.com',
      };
      const currentUser = {
        sub: 'another-user-id',
        user_type: 'user',
      };
      const mockUser = {
        id: userId,
        email: 'old@example.com',
        password: 'hashedPassword',
      };

      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser as any);

      await expect(userService.update(userId, updateUserDto, currentUser)).rejects.toThrow(
        new UnauthorizedException({
          message: SYS_MSG.UNAUTHORIZED_USER,
          status_code: HttpStatus.FORBIDDEN,
        }),
      );
    });

    it('should throw BadRequestException for an invalid password', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440000';
      const updateUserDto: UpdateUserDto = {
        password: 'short',
      };
      const currentUser = {
        sub: userId,
        user_type: 'admin',
      };
      const mockUser = {
        id: userId,
        email: 'old@example.com',
        password: 'hashedPassword',
      };

      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser as any);

      await expect(userService.update(userId, updateUserDto, currentUser)).rejects.toThrow(
        new BadRequestException({
          status_code: HttpStatus.BAD_REQUEST,
          message: SYS_MSG.INVALID_PASSWORD_FORMAT,
          data: null,
        }),
      );
    });

    it('should throw BadRequestException for an invalid email', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440000';
      const updateUserDto: UpdateUserDto = {
        email: 'invalid-email',
      };
      const currentUser = {
        sub: userId,
        user_type: 'admin',
      };
      const mockUser = {
        id: userId,
        email: 'old@example.com',
        password: 'hashedPassword',
      };

      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser as any);

      await expect(userService.update(userId, updateUserDto, currentUser)).rejects.toThrow(
        new BadRequestException({
          status_code: HttpStatus.BAD_REQUEST,
          message: SYS_MSG.INVALID_EMAIL_FORMAT,
          data: null,
        }),
      );
    });
  });
  describe('forgotPassword', () => {
    const email = 'test@example.com';
    const forgotPasswordDto: ForgotPasswordDto = {
      email,
    };

    it('should throw NotFoundException if user does not exist', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);

      await expect(userService.forgotPassword(forgotPasswordDto)).rejects.toThrow(
        new NotFoundException({
          status_code: 404,
          message: SYS_MSG.USER_NOT_FOUND,
        }),
      );
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { email: forgotPasswordDto.email },
      });
    });

    it('should create and save a ForgotPasswordToken if user exists', async () => {
      const user = { email } as User;

      jest.spyOn(userRepository, 'findOne').mockResolvedValue(user);

      const mockForgotPasswordToken = {
        email: user.email,
        reset_token: process.env.PASSWORD_RESET_TOKEN_SECRET,
        token_expiry: new Date(Date.now() + 86400000),
      } as ForgotPasswordToken;

      jest.spyOn(forgotPasswordRepository, 'create').mockReturnValue(mockForgotPasswordToken);
      jest.spyOn(forgotPasswordRepository, 'save').mockResolvedValue(mockForgotPasswordToken);
      await userService.forgotPassword(forgotPasswordDto);

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { email: forgotPasswordDto.email },
      });

      expect(forgotPasswordRepository.create).toHaveBeenCalledWith({
        email: user.email,
        reset_token: process.env.PASSWORD_RESET_TOKEN_SECRET,
        token_expiry: expect.any(Date),
      });

      expect(forgotPasswordRepository.save).toHaveBeenCalledWith(mockForgotPasswordToken);
    });
  });
});
