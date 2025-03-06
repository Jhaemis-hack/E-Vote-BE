import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from '../user.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User, UserType } from '../entities/user.entity';
import { BadRequestException, ForbiddenException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { UpdateUserDto } from '../dto/update-user.dto';

const mockUserRepository = {
  findOne: jest.fn(),
  save: jest.fn(),
};

describe('UserService - Update User', () => {
  let service: UserService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('Should successfully update a user', async () => {
    const existingUser = { id: '1', email: 'old@example.com', user_type: 'user' };
    const updateDto: UpdateUserDto = { email: 'new@example.com' };
    const currentUser = { user_type: 'admin' };

    mockUserRepository.findOne.mockResolvedValue(existingUser);
    mockUserRepository.save.mockResolvedValue({ ...existingUser, ...updateDto });

    const result = await service.update('1', updateDto, currentUser);

    expect(result).toEqual({
      message: 'User updated successfully',
      data: { ...existingUser, ...updateDto },
    });

    expect(mockUserRepository.findOne).toHaveBeenCalledWith({ where: { id: '1' } });
    expect(mockUserRepository.save).toHaveBeenCalled();
  });

  it('Should throw 401 Unauthorized if user is not authenticated', async () => {
    await expect(service.update('1', { email: 'new@example.com' }, null)).rejects.toThrow(
      new UnauthorizedException('Unauthorized request'),
    );
  });

  it('Should throw 403 Forbidden if a non-admin tries to modify user_type', async () => {
    const existingUser = { id: '1', email: 'old@example.com', user_type: 'user' };
    const updateDto: UpdateUserDto = { user_type: UserType.Admin };
    const currentUser = { user_type: 'user' };

    mockUserRepository.findOne.mockResolvedValue(existingUser);

    await expect(service.update('1', updateDto, currentUser)).rejects.toThrow(
      new ForbiddenException({
        message: 'Forbidden: Only admins can modify this field',
        status_code: 403,
      }),
    );
  });

  it('Should throw 400 Bad Request if email format is invalid', async () => {
    const existingUser = { id: '1', email: 'old@example.com', user_type: 'user' };
    const updateDto: UpdateUserDto = { email: 'invalid-email' };
    const currentUser = { user_type: 'admin' };

    mockUserRepository.findOne.mockResolvedValue(existingUser);

    await expect(service.update('1', updateDto, currentUser)).rejects.toThrow(
      new BadRequestException({
        message: 'Validation failed',
        errors: { email: 'Invalid email format' },
        status_code: 400,
      }),
    );
  });

  it('Should throw 400 Bad Request if password is too short', async () => {
    const existingUser = { id: '1', email: 'old@example.com', user_type: 'user' };
    const updateDto: UpdateUserDto = { password: 'short' };
    const currentUser = { user_type: 'admin' };

    mockUserRepository.findOne.mockResolvedValue(existingUser);

    await expect(service.update('1', updateDto, currentUser)).rejects.toThrow(
      new BadRequestException({
        message: 'Validation failed',
        errors: { password: 'Password must be at least 8 characters' },
        status_code: 400,
      }),
    );
  });

  it('Should throw 404 Not Found if user does not exist', async () => {
    mockUserRepository.findOne.mockResolvedValue(null);

    await expect(service.update('1', { email: 'new@example.com' }, { user_type: 'admin' })).rejects.toThrow(
      new NotFoundException('User not found'),
    );
  });
});
