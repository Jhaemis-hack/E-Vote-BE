import { HttpException, HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DeepPartial, In, Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import * as xlsx from 'xlsx';
import { BadRequestError } from '../../../errors';
import * as SYS_MSG from '../../../shared/constants/systemMessages';
import { Election } from '../../election/entities/election.entity';
import { Voter } from '../entities/voter.entity';
import { VoterService } from '../voter.service';

describe('VoterService', () => {
  let service: VoterService;
  let voterRepository: Repository<Voter>;
  let electionRepository: Repository<Election>;

  const mockVoterRepository = () => ({
    findAndCount: jest.fn().mockResolvedValue([[], 0]),
    save: jest
      .fn()
      .mockImplementation((entity: DeepPartial<Voter>) => Promise.resolve(Object.assign(new Voter(), entity))),
    findOne: jest.fn().mockResolvedValue(null),
    update: jest.fn().mockResolvedValue(true),
    delete: jest.fn().mockResolvedValue(true),
  });

  const mockElectionRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VoterService,
        { provide: getRepositoryToken(Voter), useFactory: mockVoterRepository },
        { provide: getRepositoryToken(Election), useValue: mockElectionRepository },
        {
          provide: getRepositoryToken(Voter),
          useClass: Repository,
        },
      ],
    }).compile();

    service = module.get<VoterService>(VoterService);
    voterRepository = module.get<Repository<Voter>>(getRepositoryToken(Voter));
    electionRepository = module.get<Repository<Election>>(getRepositoryToken(Election));

    // Reset the emailOccurrences map before each test
    (service as any).emailOccurrences = new Map<string, number[]>();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    const validAdminId = uuidv4();
    const validElectionId = uuidv4();
    const invalidElectionId = 'invalid-election-id'; // Keep for invalid UUID tests
    it('should fetch all voters eligible to vote during the election', async () => {
      const voter_list: Voter[] = [
        {
          id: '340e8400-e29b-765w-a716-446655440990',
          name: 'Bayo',
          email: 'Bayo@gmail.com',
          created_at: new Date(),
          updated_at: new Date(),
          deleted_at: null,
          is_voted: false,
          is_verified: false,
          verification_token: '',
          votes: [],
          election: { id: validElectionId } as Election,
        },
        {
          id: '340e8400-e29b-41d4-a716-446655440990',
          name: 'Tayo',
          email: 'Tayo@gmail.com',
          created_at: new Date(),
          updated_at: new Date(),
          deleted_at: null,
          is_voted: false,
          is_verified: false,
          verification_token: '',
          votes: [],
          election: { id: validElectionId } as Election,
        },
      ];

      const total = 2;
      const page = 1;
      const pageSize = 10;

      jest
        .spyOn(electionRepository, 'findOne')
        .mockResolvedValue({ id: validElectionId, created_by: validAdminId } as Election);

      jest.spyOn(voterRepository, 'findAndCount').mockResolvedValue([voter_list, total]);

      const result = await service.findAll(page, pageSize, validAdminId, validElectionId);

      expect(result).toEqual({
        status_code: 200,
        message: 'Election voters fetched successfully',
        data: {
          current_page: page,
          total_pages: 1,
          total_results: total,
          election_id: validElectionId,
          voter_list: [
            {
              voter_id: '340e8400-e29b-765w-a716-446655440990',
              name: 'Bayo',
              email: 'Bayo@gmail.com',
            },
            {
              voter_id: '340e8400-e29b-41d4-a716-446655440990',
              name: 'Tayo',
              email: 'Tayo@gmail.com',
            },
          ],
          meta: {
            hasNext: false,
            total,
            nextPage: null,
            prevPage: null,
          },
        },
      });

      expect(voterRepository.findAndCount).toHaveBeenCalledWith({
        where: { election: { id: validElectionId } },
        skip: 0,
        take: pageSize,
        relations: ['election'],
      });
    });

    it('should throw UNAUTHORIZED if adminId is missing', async () => {
      await expect(service.findAll(1, 10, '', validElectionId)).rejects.toThrow(
        new HttpException(
          { status_code: 401, message: SYS_MSG.UNAUTHORIZED_USER, data: null },
          HttpStatus.UNAUTHORIZED,
        ),
      );
    });

    it('should throw NOT_FOUND if election does not exist', async () => {
      jest.spyOn(electionRepository, 'findOne').mockResolvedValue(null);

      await expect(service.findAll(1, 10, validAdminId, invalidElectionId)).rejects.toThrow(
        new HttpException({ status_code: 404, message: SYS_MSG.ELECTION_NOT_FOUND, data: null }, HttpStatus.NOT_FOUND),
      );
    });

    it('should throw BAD_REQUEST if page or pageSize is less than 1', async () => {
      jest.spyOn(voterRepository, 'findOne').mockResolvedValue({} as Voter);

      await expect(service.findAll(0, 10, validAdminId, validElectionId)).rejects.toThrow(
        new HttpException(
          {
            status_code: 400,
            message: 'Invalid pagination parameters. Page and pageSize must be greater than 0.',
            data: null,
          },
          HttpStatus.BAD_REQUEST,
        ),
      );

      await expect(service.findAll(1, 0, validAdminId, validElectionId)).rejects.toThrow(
        new HttpException(
          {
            status_code: 400,
            message: 'Invalid pagination parameters. Page and pageSize must be greater than 0.',
            data: null,
          },
          HttpStatus.BAD_REQUEST,
        ),
      );
    });

    it('should throw NOT_FOUND if no voters are found', async () => {
      jest.spyOn(electionRepository, 'findOne').mockResolvedValue({ id: validElectionId } as Election);
      jest.spyOn(voterRepository, 'findAndCount').mockResolvedValue([[], 0]);

      await expect(service.findAll(1, 10, validAdminId, validElectionId)).rejects.toThrow(
        new HttpException(
          { status_code: 404, message: SYS_MSG.ELECTION_VOTERS_NOT_FOUND, data: null },
          HttpStatus.NOT_FOUND,
        ),
      );
    });
  });

  describe('processFile', () => {
    it('should process CSV file successfully', async () => {
      const fileBuffer = Buffer.from('name,email\nClark kent,clark@example.com\nHelen,helen@example.com');
      const file = { originalname: 'test.csv', buffer: fileBuffer } as Express.Multer.File;

      jest.spyOn(service, 'processCSV').mockResolvedValue({
        status_code: 201,
        message: 'Voters uploaded successfully',
        data: null,
      });

      const result = await service.processFile(file, '123');
      expect(result.status_code).toBe(201);
      expect(service.processCSV).toHaveBeenCalledWith(fileBuffer, '123');
    });

    it('should process Excel file successfully', async () => {
      const workbook = xlsx.utils.book_new();
      const worksheet = xlsx.utils.aoa_to_sheet([
        ['name', 'email'],
        ['John Doe', 'john@example.com'],
        ['Jane Doe', 'jane@example.com'],
      ]);
      xlsx.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
      const fileBuffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });

      const file = { originalname: 'test.xlsx', buffer: fileBuffer } as Express.Multer.File;
      jest.spyOn(service, 'processExcel').mockResolvedValue({
        status_code: 201,
        message: 'Voters uploaded successfully',
        data: null,
      });

      const result = await service.processFile(file, '123');
      expect(result.status_code).toBe(201);
      expect(service.processExcel).toHaveBeenCalledWith(fileBuffer, '123');
    });

    it('should throw BadRequestException for invalid file format', async () => {
      const file = { originalname: 'invalid.txt', buffer: Buffer.from('test') } as Express.Multer.File;

      await expect(service.processFile(file, '123')).rejects.toThrow(BadRequestError);
    });
  });

  describe('processCSV', () => {
    it('should process a valid CSV file and save voters', async () => {
      const fileBuffer = Buffer.from('name,email\nKenedy Doe,kennedy@example.com\nElla Smith,ella.smith@example.com');

      jest.spyOn(voterRepository, 'find').mockResolvedValue([]);
      jest.spyOn(voterRepository, 'save').mockResolvedValue({} as any);

      const result = await service.processCSV(fileBuffer, '123');

      expect(result.status_code).toBe(201);
      expect(voterRepository.save).toHaveBeenCalledTimes(1);
    });

    it('should reject duplicate emails in CSV', async () => {
      const fileBuffer = Buffer.from('name,email\nJohn Doe,john@example.com\nJane Doe,john@example.com');

      await expect(service.processCSV(fileBuffer, '123')).rejects.toThrow(
        new BadRequestError(
          `Oops! The following emails are already in use: john@example.com. Please use unique emails.`,
          'john@example.com',
        ),
      );
    });

    describe('processExcel', () => {
      it('should process a valid Excel file and save voters', async () => {
        const workbook = xlsx.utils.book_new();
        const worksheet = xlsx.utils.aoa_to_sheet([
          ['name', 'email'],
          ['Samson Doe', 'samson@example.com'],
          ['scarlet Johnson', 'scarlet.johnson@example.com'],
        ]);
        xlsx.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
        const fileBuffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });

        jest.spyOn(voterRepository, 'find').mockResolvedValue([]);
        jest.spyOn(voterRepository, 'save').mockResolvedValue({} as any);

        const result = await service.processExcel(fileBuffer, '123');
        expect(result.status_code).toBe(201);
        expect(voterRepository.save).toHaveBeenCalledTimes(1);
      });

      it('should reject duplicate emails in Excel', async () => {
        const workbook = xlsx.utils.book_new();
        const worksheet = xlsx.utils.aoa_to_sheet([
          ['name', 'email'],
          ['John Doe', 'john@example.com'],
          ['Jane Doe', 'john@example.com'],
        ]);
        xlsx.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
        const fileBuffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });

        await expect(service.processExcel(fileBuffer, '123')).rejects.toThrow(BadRequestError);
      });
    });

    describe('saveVoters', () => {
      it('should save voters successfully', async () => {
        const voters = [
          {
            id: '123e4567-e89b-12d3-a456-426614174000',
            name: 'John Doe',
            email: 'john@example.com',
            verification_token: '123e4567-e89b-12d3-a456-426614174001',
            election: { id: '123' },
          },
        ];

        jest.spyOn(voterRepository, 'find').mockResolvedValue([]);

        jest.spyOn(voterRepository, 'save').mockResolvedValue({} as any);

        await service.saveVoters(voters);

        expect(voterRepository.find).toHaveBeenCalledWith({
          where: { email: In(['john@example.com']), election: { id: '123' } },
          select: ['email'],
        });

        expect(voterRepository.save).toHaveBeenCalledWith(voters);
      });
    });
  });
});
