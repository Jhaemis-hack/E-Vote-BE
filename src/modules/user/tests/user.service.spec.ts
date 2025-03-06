import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from '../user.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../entities/user.entity';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { BadRequestException } from '@nestjs/common';

const mockUserRepository = () => ({
  findOne: jest.fn(),
});

describe('UserService - Login', () => {
  let userService: UserService;
  let userRepository: Repository<User>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: getRepositoryToken(User),
          useFactory: mockUserRepository,
        },
      ],
    }).compile();

    userService = module.get<UserService>(UserService);
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
  });

  it('should successfully log in a user with valid credentials', async () => {
    const payload = { email: 'user@example.com', password: 'password123' };
    const hashedPassword = await bcrypt.hash(payload.password, 10);

    userRepository.findOne = jest.fn().mockResolvedValue({
      id: '123',
      email: payload.email,
      password: hashedPassword,
    });

    jest.spyOn(bcrypt, 'compare').mockImplementation(async () => true);

    const result = await userService.login(payload);
    expect(result).toEqual({ id: '123', email: payload.email });
  });

  it('should throw BadRequestException if user does not exist', async () => {
    userRepository.findOne = jest.fn().mockResolvedValue(null);

    await expect(userService.login({ email: 'notfound@example.com', password: 'password123' })).rejects.toThrow(
      new BadRequestException('Bad credentials.'),
    );
  });

  it('should throw BadRequestException if password is incorrect', async () => {
    const payload = { email: 'user@example.com', password: 'wrongpassword' };
    const hashedPassword = await bcrypt.hash('correctpassword', 10);

    userRepository.findOne = jest.fn().mockResolvedValue({
      id: '123',
      email: payload.email,
      password: hashedPassword,
    });

    jest.spyOn(bcrypt, 'compare').mockImplementation(async () => false);

    await expect(userService.login(payload)).rejects.toThrow(new BadRequestException('Bad credentials'));
  });
});
