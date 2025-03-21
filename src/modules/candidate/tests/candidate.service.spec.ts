import { Test, TestingModule } from '@nestjs/testing';
import { CandidateService } from '../candidate.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Candidate } from '../entities/candidate.entity';
import { NotFoundException, HttpException, HttpStatus } from '@nestjs/common';
import * as SYS_MSG from '../../../shared/constants/systemMessages';

// Mock the createClient function from Supabase
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    storage: {
      from: jest.fn().mockReturnThis(),
      upload: jest.fn().mockResolvedValue({ error: null }),
      getPublicUrl: jest.fn().mockReturnValue({
        data: { publicUrl: 'https://supabase-url.com/photo.jpg' },
      }),
    },
  })),
}));

describe('CandidateService', () => {
  let service: CandidateService;
  let candidateRepository: any;

  beforeEach(async () => {
    // Mock environment variables
    process.env.SUPABASE_URL = 'https://mock-supabase-url.com';
    process.env.SUPABASE_ANON_KEY = 'mock-anon-key';
    process.env.SUPABASE_BUCKET = 'mock-bucket';
    process.env.DEFAULT_PHOTO_URL = 'https://default-photo-url.com';

    candidateRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [CandidateService, { provide: getRepositoryToken(Candidate), useValue: candidateRepository }],
    }).compile();

    service = module.get<CandidateService>(CandidateService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    // Clean up environment variables after tests
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_ANON_KEY;
    delete process.env.SUPABASE_BUCKET;
    delete process.env.DEFAULT_PHOTO_URL;
  });

  describe('updatePhoto', () => {
    const candidateId = '123';
    const mockCandidate = { id: candidateId, photo_url: 'old-photo-url' };
    const mockFile = {
      mimetype: 'image/jpeg',
      size: 1024 * 1024, // 1MB
      buffer: Buffer.from('mock file buffer'),
      originalname: 'photo.jpg',
    } as Express.Multer.File;

    it('should throw NotFoundException if candidate is not found', async () => {
      candidateRepository.findOne.mockResolvedValue(null);

      await expect(service.updatePhoto(candidateId, mockFile)).rejects.toThrow(
        new NotFoundException(`Candidate with ID ${candidateId} not found`),
      );

      expect(candidateRepository.findOne).toHaveBeenCalledWith({ where: { id: candidateId } });
    });

    it('should update photo URL to default if no file is provided', async () => {
      candidateRepository.findOne.mockResolvedValue({ ...mockCandidate });
      candidateRepository.save.mockResolvedValue({ ...mockCandidate, photo_url: 'https://default-photo-url.com' });

      const result = await service.updatePhoto(candidateId, null);

      expect(result.photo_url).toBe('https://default-photo-url.com');
      expect(candidateRepository.save).toHaveBeenCalledWith({
        ...mockCandidate,
        photo_url: 'https://default-photo-url.com',
      });
    });

    it('should throw HttpException for invalid file types', async () => {
      const invalidFile = { ...mockFile, mimetype: 'application/pdf' } as Express.Multer.File;

      candidateRepository.findOne.mockResolvedValue({ ...mockCandidate });

      await expect(service.updatePhoto(candidateId, invalidFile)).rejects.toThrow(
        new HttpException(
          { status_code: HttpStatus.BAD_REQUEST, message: SYS_MSG.INVALID_FILE_TYPE, data: null },
          HttpStatus.BAD_REQUEST,
        ),
      );
    });

    it('should throw HttpException for files exceeding size limit', async () => {
      const largeFile = { ...mockFile, size: 3 * 1024 * 1024 } as Express.Multer.File; // 3MB

      candidateRepository.findOne.mockResolvedValue({ ...mockCandidate });

      await expect(service.updatePhoto(candidateId, largeFile)).rejects.toThrow(
        new HttpException(
          { status_code: HttpStatus.BAD_REQUEST, message: SYS_MSG.PHOTO_SIZE_LIMIT, data: null },
          HttpStatus.BAD_REQUEST,
        ),
      );
    });

    it('should upload file to Supabase and update candidate photo URL', async () => {
      candidateRepository.findOne.mockResolvedValue({ ...mockCandidate });
      candidateRepository.save.mockResolvedValue({
        ...mockCandidate,
        photo_url: 'https://supabase-url.com/photo.jpg',
      });

      const result = await service.updatePhoto(candidateId, mockFile);

      expect(result.photo_url).toBe('https://supabase-url.com/photo.jpg');
      expect(candidateRepository.save).toHaveBeenCalledWith({
        ...mockCandidate,
        photo_url: 'https://supabase-url.com/photo.jpg',
      });
    });

    // For the failing test case, modify your approach to mock the error scenario
    it('should handle Supabase upload errors gracefully', async () => {
      // Create a temporary one-time mock implementation
      const mockStorageWithError = {
        from: jest.fn().mockReturnThis(),
        upload: jest.fn().mockResolvedValue({ error: new Error('Upload failed') }),
      };

      // Mock the service's supabase instance directly
      (service as any).supabase = {
        storage: mockStorageWithError,
      };

      candidateRepository.findOne.mockResolvedValue({ ...mockCandidate });

      await expect(service.updatePhoto(candidateId, mockFile)).rejects.toThrow(
        new HttpException(
          { status_code: HttpStatus.INTERNAL_SERVER_ERROR, message: SYS_MSG.FAILED_PHOTO_UPDATE, data: null },
          HttpStatus.INTERNAL_SERVER_ERROR,
        ),
      );
    });
  });
});
