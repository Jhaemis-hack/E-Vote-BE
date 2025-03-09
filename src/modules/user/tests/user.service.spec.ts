import { BadRequestException, HttpStatus, NotFoundException } from '@nestjs/common';
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

interface CreateUserDto {
  id?: string;
  first_name: string;
  last_name: string;
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
        first_name: 'John',
        last_name: 'Doe',
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
          first_name: adminDto.first_name,
          last_name: adminDto.last_name,
          email: adminDto.email,
          token: 'mockedToken',
          is_verified: undefined,
        },
      });
    });

    it('❌ should throw an error for an invalid email format', async () => {
      const userDto: CreateUserDto = {
        first_name: 'John',
        last_name: 'Doe',
        email: 'invalid-email',
        password: 'StrongPass1!',
      };

      await expect(userService.registerAdmin(userDto)).rejects.toThrow(new BadRequestException('Invalid email format'));
    });

    it('❌ should throw an error if email is already in use', async () => {
      const userDto: CreateUserDto = {
        first_name: 'John',
        last_name: 'Doe',
        email: 'admin@example.com',
        password: 'StrongPass1!',
      };

      userRepository.findOne = jest.fn().mockResolvedValue(userDto as User); // Simulate email already in use

      await expect(userService.registerAdmin(userDto)).rejects.toThrow(new BadRequestException('Email already in use'));
    });

    it('❌ should throw an error for a weak password', async () => {
      const userDto: CreateUserDto = {
        first_name: 'John',
        last_name: 'Doe',
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

      await expect(userService.login(loginDto)).rejects.toThrow(new BadRequestException('Bad credentials.'));
    });

    it('should throw an error for incorrect password', async () => {
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

      await expect(userService.login(loginDto)).rejects.toThrow(new BadRequestException('Bad credentials'));
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
});
