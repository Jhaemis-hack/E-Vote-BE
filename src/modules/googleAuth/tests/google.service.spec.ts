import { Test, TestingModule } from '@nestjs/testing';
import { GoogleService } from '../google.auth.service';
import { JwtService } from '@nestjs/jwt';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../../user/entities/user.entity';
import { Repository } from 'typeorm';
import { HttpException, HttpStatus } from '@nestjs/common';

const mockUserRepository = {
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
};

const mockJwtService = {
  sign: jest.fn(() => 'mocked_jwt_token'),
};

globalThis.fetch = jest.fn();

describe('GoogleAuthService', () => {
  let service: GoogleService;
  let _: Repository<User>;
  let __: JwtService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GoogleService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    service = module.get<GoogleService>(GoogleService);
    _ = module.get<Repository<User>>(getRepositoryToken(User));
    __ = module.get<JwtService>(JwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should throw UNAUTHORIZED if id_token is missing', async () => {
    await expect(service.googleAuth({ id_token: '' })).rejects.toThrow(
      new HttpException(
        { status_code: HttpStatus.UNAUTHORIZED, message: 'Invalid credentials', data: null },
        HttpStatus.UNAUTHORIZED,
      ),
    );
  });

  it('should throw UNAUTHORIZED if Google token is invalid', async () => {
    (globalThis.fetch as jest.Mock).mockResolvedValue({
      status: 400,
      json: jest.fn().mockResolvedValue({}),
    });

    await expect(service.googleAuth({ id_token: 'invalid_token' })).rejects.toThrow(
      new HttpException(
        { status_code: HttpStatus.UNAUTHORIZED, message: 'Invalid credentials', data: null },
        HttpStatus.UNAUTHORIZED,
      ),
    );
  });

  it('should throw SERVER_ERROR if Google API fails', async () => {
    (globalThis.fetch as jest.Mock).mockResolvedValue({
      status: 500,
      json: jest.fn().mockResolvedValue({}),
    });

    await expect(service.googleAuth({ id_token: 'valid_token' })).rejects.toThrow(
      new HttpException(
        { status_code: HttpStatus.INTERNAL_SERVER_ERROR, message: 'Sorry a server error occured', data: null },
        HttpStatus.INTERNAL_SERVER_ERROR,
      ),
    );
  });

  it('should register a new user and return JWT token', async () => {
    const mockGoogleResponse = {
      email: 'newuser@example.com',
      first_name: 'John',
      last_name: 'Doe',
      profile_picture: 'profile_pic_url',
    };

    (globalThis.fetch as jest.Mock).mockResolvedValue({
      status: 200,
      json: jest.fn().mockResolvedValue(mockGoogleResponse),
    });

    mockUserRepository.findOne.mockResolvedValue(null); // No existing user
    mockUserRepository.create.mockReturnValue({ id: '123', ...mockGoogleResponse });
    mockUserRepository.save.mockResolvedValue({ id: '123', ...mockGoogleResponse });

    const result = await service.googleAuth({ id_token: 'valid_token' });

    expect(result).toEqual({
      message: 'Authentication successful',
      data: {
        id: '123',
        email: 'newuser@example.com',
        first_name: 'John',
        last_name: 'Doe',
        profile_picture: 'profile_pic_url',
        token: 'mocked_jwt_token',
      },
    });
  });

  it('should log in an existing user and return JWT token', async () => {
    const mockExistingUser = {
      id: '123',
      email: 'existinguser@example.com',
      first_name: 'Jane',
      last_name: 'Doe',
      profile_picture: 'profile_pic_url',
    };

    (globalThis.fetch as jest.Mock).mockResolvedValue({
      status: 200,
      json: jest.fn().mockResolvedValue({
        email: 'existinguser@example.com',
        given_name: 'Jane',
        family_name: 'Doe',
        picture: 'profile_pic_url',
      }),
    });

    mockUserRepository.findOne.mockResolvedValue(mockExistingUser); // Existing user

    const result = await service.googleAuth({ id_token: 'valid_token' });

    expect(result).toEqual({
      message: 'Authentication successful',
      data: {
        id: '123',
        email: 'existinguser@example.com',
        first_name: 'Jane',
        last_name: 'Doe',
        profile_picture: 'profile_pic_url',
        token: 'mocked_jwt_token',
      },
    });
  });
});
