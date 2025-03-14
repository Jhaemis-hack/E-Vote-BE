import { Test, TestingModule } from '@nestjs/testing';
import { VoterService } from '../voter.service';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Voter } from '../entities/voter.entity';
import { BadRequestException } from '@nestjs/common';
import * as xlsx from 'xlsx';
import * as csv from 'csv-parser';
import * as stream from 'stream';

describe('VoterService', () => {
  let service: VoterService;
  let voterRepository: Repository<Voter>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VoterService,
        {
          provide: getRepositoryToken(Voter),
          useClass: Repository,
        },
      ],
    }).compile();

    service = module.get<VoterService>(VoterService);
    voterRepository = module.get<Repository<Voter>>(getRepositoryToken(Voter));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('processFile', () => {
    it('should process CSV file successfully', async () => {
      const fileBuffer = Buffer.from('name,email\nJohn Doe,john@example.com\nJane Doe,jane@example.com');
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

      await expect(service.processFile(file, '123')).rejects.toThrow(BadRequestException);
    });
  });

  describe('processCSV', () => {
    it('should process a valid CSV file and save voters', async () => {
      const fileBuffer = Buffer.from('name,email\nJohn Doe,john@example.com\nJane Doe,jane@example.com');

      jest.spyOn(voterRepository, 'insert').mockResolvedValue({} as any);

      const result = await service.processCSV(fileBuffer, '123');
      expect(result.status_code).toBe(201);
      expect(voterRepository.insert).toHaveBeenCalledTimes(1);
    });

    it('should reject duplicate emails in CSV', async () => {
      const fileBuffer = Buffer.from('name,email\nJohn Doe,john@example.com\nJane Doe,john@example.com');

      await expect(service.processCSV(fileBuffer, '123')).rejects.toThrow(BadRequestException);
    });
  });

  describe('processExcel', () => {
    it('should process a valid Excel file and save voters', async () => {
      const workbook = xlsx.utils.book_new();
      const worksheet = xlsx.utils.aoa_to_sheet([
        ['name', 'email'],
        ['John Doe', 'john@example.com'],
        ['Jane Doe', 'jane@example.com'],
      ]);
      xlsx.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
      const fileBuffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });

      jest.spyOn(voterRepository, 'insert').mockResolvedValue({} as any);

      const result = await service.processExcel(fileBuffer, '123');
      expect(result.status_code).toBe(201);
      expect(voterRepository.insert).toHaveBeenCalledTimes(1);
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

      await expect(service.processExcel(fileBuffer, '123')).rejects.toThrow(BadRequestException);
    });
  });

  describe('saveVoters', () => {
    it('should save voters successfully', async () => {
      const voters = [{ name: 'John Doe', email: 'john@example.com', election: { id: '123' } }];
      jest.spyOn(voterRepository, 'insert').mockResolvedValue({} as any);

      await service.saveVoters(voters);
      expect(voterRepository.insert).toHaveBeenCalledWith(voters);
    });
  });
});
