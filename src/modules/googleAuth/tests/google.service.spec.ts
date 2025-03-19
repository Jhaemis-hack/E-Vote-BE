import { Test, TestingModule } from '@nestjs/testing';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { GoogleService } from '../google.auth.service';
import { User } from '../../user/entities/user.entity';
const mockUserRepo = {
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
};

describe('GoogleService', () => {
  let service: GoogleService;
  let userRepository: Repository<User>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GoogleService, { provide: getRepositoryToken(User), useValue: mockUserRepo }],
    }).compile();

    service = module.get<GoogleService>(GoogleService);
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return an existing user if found', async () => {
    const mockUser = { id: 1, email: 'test@example.com', is_verified: false };
    mockUserRepo.findOne.mockResolvedValue(mockUser);
    mockUserRepo.save.mockResolvedValue({ ...mockUser, is_verified: true });

    const result = await service.validateUser({ email: 'test@example.com' });

    expect(mockUserRepo.findOne).toHaveBeenCalledWith({ where: { email: 'test@example.com' } });
    expect(mockUserRepo.save).toHaveBeenCalledWith({ ...mockUser, is_verified: true });
    expect(result.is_verified).toBe(true);
  });

  it('should create a new user if not found', async () => {
    const userDetails = {
      email: 'newuser@example.com',
      firstName: 'John',
      lastName: 'Doe',
      googleId: 'google123',
      profilePicture: 'http://image.url',
    };

    const expectedUser = {
      email: 'newuser@example.com',
      first_name: 'John',
      last_name: 'Doe',
      google_id: 'google123',
      profile_picture: 'http://image.url',
      is_verified: true,
    };

    mockUserRepo.findOne.mockResolvedValue(null);
    mockUserRepo.create.mockReturnValue(expectedUser);
    mockUserRepo.save.mockResolvedValue(expectedUser);

    const result = await service.validateUser(userDetails);

    expect(mockUserRepo.create).toHaveBeenCalledWith(expectedUser);
    expect(mockUserRepo.save).toHaveBeenCalledWith(expectedUser);
    expect(result.email).toBe('newuser@example.com');
  });
});
