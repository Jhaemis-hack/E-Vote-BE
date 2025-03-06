import { Repository } from 'typeorm';
import { VoteLinkService } from '../votelink.service';
import { VoteLink } from '../entities/votelink.entity';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Election } from '../../election/entities/election.entity';
import { HttpStatus, NotFoundException } from '@nestjs/common';
import { CreateVoteLinkDto } from '../dto/create-votelink.dto';
import { randomUUID } from 'crypto';

describe('VoteLinkService', () => {
  let service: VoteLinkService;
  let voteLinkRepository: Repository<VoteLink>;
  let electionRepository: Repository<Election>;

  const mockVoteLinkRepository = () => ({
    create: jest.fn(),
    save: jest.fn(),
  });

  const mockElectionRepository = () => ({
    findOne: jest.fn(),
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VoteLinkService,
        {
          provide: getRepositoryToken(VoteLink),
          useFactory: mockVoteLinkRepository,
        },
        {
          provide: getRepositoryToken(Election),
          useFactory: mockElectionRepository,
        },
      ],
    }).compile();

    service = module.get<VoteLinkService>(VoteLinkService);
    voteLinkRepository = module.get<Repository<VoteLink>>(getRepositoryToken(VoteLink));
    electionRepository = module.get<Repository<Election>>(getRepositoryToken(Election));
  });

  describe('create', () => {
    it('should successfully create a vote link', async () => {
      const createVoteLinkDto: CreateVoteLinkDto = {
        election_id: '550e8400-e29b-41d4-a716-446655440000',
      };

      const election = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        title: '2023 Presidential Election',
      } as Election;

      const unique_link = `${process.env.APP_URL}/vote/${randomUUID()}`;

      jest.spyOn(electionRepository, 'findOne').mockResolvedValue(election);
      jest.spyOn(voteLinkRepository, 'create').mockReturnValue({
        election,
        election_id: createVoteLinkDto.election_id,
        unique_link,
      } as VoteLink);
      jest.spyOn(voteLinkRepository, 'save').mockResolvedValue({
        election,
        election_id: createVoteLinkDto.election_id,
        unique_link,
      } as VoteLink);

      const result = await service.create(createVoteLinkDto);

      expect(result).toEqual({
        status_code: HttpStatus.CREATED,
        message: 'Successfully created a votelink',
        data: {
          unique_link,
        },
      });

      expect(electionRepository.findOne).toHaveBeenCalledWith({
        where: { id: createVoteLinkDto.election_id },
      });
      expect(voteLinkRepository.create).toHaveBeenCalledWith({
        election,
        election_id: createVoteLinkDto.election_id,
        unique_link,
      });
      expect(voteLinkRepository.save).toHaveBeenCalled();
    });

    it('should throw an error if the election does not exist', async () => {
      const createVoteLinkDto: CreateVoteLinkDto = {
        election_id: '550e8400-e29b-41d4-a716-446655440000',
      };

      jest.spyOn(electionRepository, 'findOne').mockResolvedValue(null);

      await expect(service.create(createVoteLinkDto)).rejects.toThrow(
        new NotFoundException(`Election with id ${createVoteLinkDto.election_id} not found`),
      );

      expect(electionRepository.findOne).toHaveBeenCalledWith({
        where: { id: createVoteLinkDto.election_id },
      });
    });

    it('should generate a unique link correctly', async () => {
      const createVoteLinkDto: CreateVoteLinkDto = {
        election_id: '550e8400-e29b-41d4-a716-446655440000',
      };

      const election = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        title: '2023 Presidential Election',
      } as Election;

      const unique_link = `${process.env.APP_URL}/vote/${randomUUID()}`;

      jest.spyOn(electionRepository, 'findOne').mockResolvedValue(election);
      jest.spyOn(voteLinkRepository, 'create').mockReturnValue({
        election,
        election_id: createVoteLinkDto.election_id,
        unique_link,
      } as VoteLink);
      jest.spyOn(voteLinkRepository, 'save').mockResolvedValue({
        election,
        election_id: createVoteLinkDto.election_id,
        unique_link,
      } as VoteLink);

      const result = await service.create(createVoteLinkDto);

      expect(result.data.unique_link).toContain(`${process.env.APP_URL}/vote/`);
      expect(result.data.unique_link).toHaveLength(process.env.APP_URL!.length + 41); // 41 = length of randomUUID()
    });

    it('should save the vote link to the database', async () => {
      const createVoteLinkDto: CreateVoteLinkDto = {
        election_id: '550e8400-e29b-41d4-a716-446655440000',
      };

      const election = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        title: '2023 Presidential Election',
      } as Election;

      const unique_link = `${process.env.APP_URL}/vote/${randomUUID()}`;

      jest.spyOn(electionRepository, 'findOne').mockResolvedValue(election);
      jest.spyOn(voteLinkRepository, 'create').mockReturnValue({
        election,
        election_id: createVoteLinkDto.election_id,
        unique_link,
      } as VoteLink);
      jest.spyOn(voteLinkRepository, 'save').mockResolvedValue({
        election,
        election_id: createVoteLinkDto.election_id,
        unique_link,
      } as VoteLink);

      await service.create(createVoteLinkDto);

      expect(voteLinkRepository.save).toHaveBeenCalledWith({
        election,
        election_id: createVoteLinkDto.election_id,
        unique_link,
      });
    });
  });
});
