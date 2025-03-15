import { HttpException, HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DeepPartial, Repository } from 'typeorm';
import { VoterService } from '../voter.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Voter } from '../entities/voter.entity';
import { Election } from '../../election/entities/election.entity';
import * as SYS_MSG from '../../../shared/constants/systemMessages';
import { v4 as uuidv4 } from 'uuid';

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
      ],
    }).compile();

    service = module.get<VoterService>(VoterService);
    voterRepository = module.get<Repository<Voter>>(getRepositoryToken(Voter));
    electionRepository = module.get<Repository<Election>>(getRepositoryToken(Election));
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
          election: { id: validElectionId } as Election,
        },
        {
          id: '340e8400-e29b-41d4-a716-446655440990',
          name: 'Tayo',
          email: 'Tayo@gmail.com',
          created_at: new Date(),
          updated_at: new Date(),
          deleted_at: null,
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
          voter_list: [
            {
              election_id: validElectionId,
              name: 'Bayo',
              email: 'Bayo@gmail.com',
            },
            {
              election_id: validElectionId,
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
});
