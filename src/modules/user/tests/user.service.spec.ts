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

interface CreateUserDto {
  id?: string;
  email: string;
  password: string;
}

describe('UserService', () => {
  let userService: UserService;
  let userRepository: Repository<User>;
  let jwtService: JwtService;
  let configService: ConfigService;

  beforeEach(async () => {
    const mockUserRepository = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      softRemove: jest.fn(),
    };

    const mockJwtService = {
      sign: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn().mockReturnValue('mocked-secret-key'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository, // Provide a mock repository
        },
        {
          provide: JwtService,
          useValue: mockJwtService, // Mock JWT service
        },
        {
          provide: ConfigService,
          useValue: mockConfigService, // Mock ConfigService
        },
      ],
    }).compile();

    userService = module.get<UserService>(UserService);
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    jwtService = module.get<JwtService>(JwtService);
    configService = module.get<ConfigService>(ConfigService);
  });

  describe('registerAdmin', () => {
    it('✅ should register an admin successfully', async () => {
      const adminDto: CreateUserDto = {
        id: randomUUID(),
        email: 'admin@example.com',
        password: 'StrongPass1!',
      };

      userRepository.findOne = jest.fn().mockResolvedValue(null); // Ensure findOne does not return a user
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
      };

      await expect(userService.registerAdmin(userDto)).rejects.toThrow(new BadRequestException('Invalid email format'));
    });

    it('❌ should throw an error if email is already in use', async () => {
      const userDto: CreateUserDto = {
        email: 'admin@example.com',
        password: 'StrongPass1!',
      };

      userRepository.findOne = jest.fn().mockResolvedValue(userDto as User); // Simulate email already in use

      await expect(userService.registerAdmin(userDto)).rejects.toThrow(new BadRequestException('Email already in use'));
    });

    it('❌ should throw an error for a weak password', async () => {
      const userDto: CreateUserDto = {
        email: 'admin@example.com',
        password: 'weakpass',
      };

      userRepository.findOne = jest.fn().mockResolvedValue(null); // Ensure findOne does not return a user

      await expect(userService.registerAdmin(userDto)).rejects.toThrow(
        new BadRequestException(
          'Password must be at least 8 characters long and include a number and special character',
        ),
      );
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
        message: SYS_MSG.LOGIN_MESSAGE, // e.g. "You have successfully logged in."
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

      // Simulate user not found
      userRepository.findOne = jest.fn().mockResolvedValue(null);

      await expect(userService.login(loginDto)).rejects.toThrow(new UnauthorizedException(SYS_MSG.EMAIL_NOT_FOUND));
    });

    it('should throw an error for incorrect password', async () => {
      const loginDto: LoginDto = {
        email: 'user@example.com',
        password: 'WrongPass1!',
      };

      // The actual password was "CorrectPass1!"
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
        hashPassword: 'hashedPassword',
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
    it('✅ should update a user successfully', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440000';
      const updateUserDto: UpdateUserDto = {
        email: 'new@example.com',
      };
      const currentUser = {
        id: userId,
        user_type: 'admin',
      };
      const mockUser = {
        id: userId,
        email: 'old@example.com',
        password: 'hashedPassword',
      };

      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser as any);
      jest.spyOn(userRepository, 'save').mockResolvedValue({ ...mockUser, ...updateUserDto } as any);

      const result = await userService.update(userId, updateUserDto, currentUser);

      expect(result).toEqual({
        status_code: HttpStatus.OK,
        message: SYS_MSG.USER_UPDATED,
        data: { ...mockUser, ...updateUserDto },
      });
    });

    it('❌ should throw UnauthorizedException if currentUser is not provided', async () => {
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

    it('❌ should throw NotFoundException if user does not exist', async () => {
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

    it('❌ should throw UnauthorizedException if a non-admin tries to update another user', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440000';
      const updateUserDto: UpdateUserDto = {
        email: 'new@example.com',
      };
      const currentUser = {
        id: 'another-user-id',
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

    it('❌ should throw BadRequestException for an invalid password', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440000';
      const updateUserDto: UpdateUserDto = {
        password: 'short',
      };
      const currentUser = {
        id: userId,
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
          message: SYS_MSG.VALIDATON_ERROR,
          data: { password: 'Password must be at least 8 characters long' },
          status_code: HttpStatus.BAD_REQUEST,
        }),
      );
    });

    it('❌ should throw BadRequestException for an invalid email', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440000';
      const updateUserDto: UpdateUserDto = {
        email: 'invalid-email',
      };
      const currentUser = {
        id: userId,
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
          message: SYS_MSG.VALIDATON_ERROR,
          data: { email: 'Invalid email format' },
          status_code: HttpStatus.BAD_REQUEST,
        }),
      );
    });
  });
});
