import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';
import { User, UserType } from './entities/user.entity';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from './dto/create-user.dto';

describe('UserService - registerAdmin', () => {
  let userService: UserService;
  let userRepository: Repository<User>;
  let jwtService: JwtService;
  let configService: ConfigService;

  beforeEach(async () => {
    const mockUserRepository = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
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
          useValue: mockUserRepository, // ✅ Provide a mock repository
        },
        {
          provide: JwtService,
          useValue: mockJwtService, // ✅ Mock JWT service
        },
        {
          provide: ConfigService,
          useValue: mockConfigService, // ✅ Mock ConfigService
        },
      ],
    }).compile();

    userService = module.get<UserService>(UserService);
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    jwtService = module.get<JwtService>(JwtService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('✅ should register an admin successfully', async () => {
    const adminDto: CreateUserDto = {
      email: 'admin@example.com',
      password: 'StrongPass1!',
      user_type: UserType.Admin,
      first_name: 'John',
      last_name: 'Doe',
    };

    userRepository.findOne = jest.fn().mockResolvedValue(null); // ✅ Ensure findOne does not return a user
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
      message: 'Admin registered successfully',
      data: { email: adminDto.email, user_type: adminDto.user_type },
      token: 'mockedToken',
    });
  });

  it('❌ should throw an error if user_type is not admin', async () => {
    const userDto: CreateUserDto = {
      email: 'user@example.com',
      password: 'StrongPass1!',
      user_type: UserType.User,
      first_name: 'Jane',
      last_name: 'Doe',
    };

    await expect(userService.registerAdmin(userDto)).rejects.toThrow(
      new BadRequestException('Only admins can be registered here.'),
    );
  });

  it('❌ should throw an error for an invalid email format', async () => {
    const userDto: CreateUserDto = {
      email: 'invalid-email',
      password: 'StrongPass1!',
      user_type: UserType.Admin,
      first_name: 'Jane',
      last_name: 'Doe',
    };

    await expect(userService.registerAdmin(userDto)).rejects.toThrow(new BadRequestException('Invalid email format'));
  });

  it('❌ should throw an error if email is already in use', async () => {
    const userDto: CreateUserDto = {
      email: 'admin@example.com',
      password: 'StrongPass1!',
      user_type: UserType.Admin,
      first_name: 'John',
      last_name: 'Doe',
    };

    userRepository.findOne = jest.fn().mockResolvedValue(userDto as User); // ✅ Simulate email already in use

    await expect(userService.registerAdmin(userDto)).rejects.toThrow(new BadRequestException('Email already in use'));
  });

  it('❌ should throw an error for a weak password', async () => {
    const userDto: CreateUserDto = {
      email: 'admin@example.com',
      password: 'weakpass',
      user_type: UserType.Admin,
      first_name: 'John',
      last_name: 'Doe',
    };

    userRepository.findOne = jest.fn().mockResolvedValue(null); // ✅ Ensure findOne does not return a user

    await expect(userService.registerAdmin(userDto)).rejects.toThrow(
      new BadRequestException('Password must be at least 8 characters long and include a number and special character'),
    );
  });
});
