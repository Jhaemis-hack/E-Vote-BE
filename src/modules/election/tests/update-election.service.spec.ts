import { NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { ElectionService } from '../election.service';
import { Election, ElectionStatus, ElectionType } from '../entities/election.entity';
import { Candidate } from 'src/modules/candidate/entities/candidate.entity';
import { Vote } from 'src/modules/votes/entities/votes.entity';
import { User } from 'src/modules/user/entities/user.entity';
import { UpdateElectionDto } from '../dto/update-election.dto';
import { ElectionStatusUpdaterService } from 'src/schedule-tasks/election-status-updater.service';
import { EmailService } from 'src/modules/email/email.service';
import { Voter } from 'src/modules/voter/entities/voter.entity';
import { VoterService } from 'src/modules/voter/voter.service';

describe('ElectionService - update', () => {
  let service: ElectionService;
  let electionRepository: Repository<Election>;
  let candidateRepository: Repository<Candidate>;
  let voteRepository: Repository<Vote>;
  let voterRepository: Repository<Voter>;
  let userRepository: Repository<User>;
  let electionStatusUpdaterService: ElectionStatusUpdaterService;
  let emailService: EmailService;
  let voterService: VoterService;

  beforeEach(() => {
    electionRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
    } as unknown as Repository<Election>;

    candidateRepository = {} as Repository<Candidate>;
    voteRepository = {} as Repository<Vote>;
    voterRepository = {} as Repository<Voter>;
    userRepository = {} as Repository<User>;
    electionStatusUpdaterService = {} as ElectionStatusUpdaterService;

    // Mock the ElectionStatusUpdaterService
    electionStatusUpdaterService = {
      scheduleElectionUpdates: jest.fn(),
    } as unknown as ElectionStatusUpdaterService;

    emailService = {
      sendElectionReminderEmails: jest.fn(),
    } as unknown as EmailService;

    voterService = {
      sendVoterInviteEmails: jest.fn(),
    } as unknown as VoterService;

    // Provide all 4 arguments to the ElectionService constructor
    service = new ElectionService(
      electionRepository,
      candidateRepository,
      voteRepository,
      voterRepository,
      userRepository,
      electionStatusUpdaterService,
      emailService,
      voterService,
    );
  });

  it('should update an election successfully including election_type', async () => {
    const electionId = '550e8400-e29b-41d4-a716-446655440000';

    const updateElectionDto: UpdateElectionDto = {
      title: 'Updated Election Title',
      description: 'This is an updated description.',
      start_date: new Date('2025-06-01T00:00:00Z'),
      end_date: new Date('2025-06-02T00:00:00Z'),
      election_status: ElectionStatus.ONGOING,
      candidates: [
        { name: 'Tommy', photo_url: 'https://tommy.com', bio: 'Tommy is a great candidate' },
        { name: 'Ben', photo_url: 'https://ben.com', bio: 'Ben is a great leader' },
      ],
      start_time: '20:25:22',
      end_time: '20:23:23',
      election_type: ElectionType.SINGLECHOICE,
      max_choices: 1,
      email_notification: false,
    };

    const existingElection = {
      id: electionId,
      title: 'Original Election Title',
      description: 'Original description.',
      start_date: new Date('2025-05-01T00:00:00Z'),
      end_date: new Date('2025-05-02T00:00:00Z'),
      election_status: ElectionStatus.ONGOING,
      created_by: 'admin123',
      created_by_user: {} as User,
      candidates: [] as Candidate[],
      votes: [] as Vote[],
      status: ElectionStatus.ONGOING,
      vote_id: 'https://vote-link.com',
      start_time: '08:00:00',
      voters: [],
      end_time: '17:00:00',
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      type: ElectionType.SINGLECHOICE,
      max_choices: 1,
      email_notification: false,
    };

    jest.spyOn(electionRepository, 'findOne').mockResolvedValue(existingElection);

    const savedElection = {
      ...existingElection,
      id: electionId,
      title: 'Original Election Title',
      description: 'Original description.',
      start_date: new Date('2025-05-01T00:00:00Z'),
      end_date: new Date('2025-05-02T00:00:00Z'),
      created_by: 'admin123',
      created_by_user: {} as User,
      candidates: [] as Candidate[],
      votes: [] as Vote[],
      vote_link: 'https://vote-link.com',
      start_time: '08:00:00',
      end_time: '17:00:00',
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      type: ElectionType.SINGLECHOICE,
      max_choices: 1,
    };

    jest.spyOn(electionRepository, 'save').mockResolvedValue(savedElection);

    const result = await service.update(electionId, updateElectionDto);

    expect(result).toEqual(savedElection);
    expect(electionRepository.findOne).toHaveBeenCalledWith({ where: { id: electionId } });
    expect(electionRepository.save).toHaveBeenCalled();
  });

  it('should throw NotFoundException if the election does not exist', async () => {
    const electionId = 'non-existent-id';
    const updateElectionDto: UpdateElectionDto = {
      title: 'Updated Election Title',
      election_status: ElectionStatus.UPCOMING,
      candidates: [
        { name: 'Tommy', photo_url: 'https://tommy.com', bio: 'Tommy is a great candidate' },
        { name: 'Ben', photo_url: 'https://ben.com', bio: 'Ben is a great leader' },
      ],
      start_time: '08:00:00',
      end_time: '17:00:00',
      start_date: new Date('2023-11-01T00:00:00.000Z'),
      end_date: new Date('2023-11-30T23:59:59.000Z'),
      election_type: ElectionType.SINGLECHOICE,
      max_choices: 1,
    };

    jest.spyOn(electionRepository, 'findOne').mockResolvedValue(null);

    await expect(service.update(electionId, updateElectionDto)).rejects.toThrow(NotFoundException);
    expect(electionRepository.findOne).toHaveBeenCalledWith({ where: { id: electionId } });
  });

  it('should throw an error if start_date is after end_date', async () => {
    const electionId = '550e8400-e29b-41d4-a716-446655440000';

    const updateElectionDto: UpdateElectionDto = {
      start_date: new Date('2025-06-02T00:00:00Z'),
      end_date: new Date('2025-06-01T00:00:00Z'),
      candidates: [
        { name: 'Tommy', photo_url: 'https://tommy.com', bio: 'Tommy is a great candidate' },
        { name: 'Ben', photo_url: 'https://ben.com', bio: 'Ben is a great leader' },
      ],
      election_status: ElectionStatus.ONGOING,
      start_time: '08:00:00',
      end_time: '17:00:00',
      election_type: ElectionType.SINGLECHOICE,
      max_choices: 1,
    };

    const existingElection = {
      id: electionId,
      title: 'Original Election Title',
      description: 'Original description.',
      start_date: new Date('2027-05-01T00:00:00Z'),
      end_date: new Date('2025-05-02T00:00:00Z'),
      election_status: ElectionStatus.COMPLETED,
      created_by: 'admin123',
      created_by_user: {} as User,
      candidates: [] as Candidate[],
      votes: [] as Vote[],
      voters: [],
      status: ElectionStatus.ONGOING,
      vote_id: 'https://vote-link.com',
      start_time: '08:00:00',
      end_time: '17:00:00',
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      type: ElectionType.SINGLECHOICE,
      max_choices: 1,
      email_notification: false,
    };

    jest.spyOn(electionRepository, 'findOne').mockResolvedValue(existingElection);

    await expect(service.update(electionId, updateElectionDto)).rejects.toThrow('start_date must be before end_date');
  });

  it('should handle database errors during update', async () => {
    const electionId = '550e8400-e29b-41d4-a716-446655440000';
    const updateElectionDto: UpdateElectionDto = {
      title: 'Updated Election Title',
      candidates: [
        { name: 'Tommy', photo_url: 'https://tommy.com', bio: 'Tommy is a great candidate' },
        { name: 'Ben', photo_url: 'https://ben.com', bio: 'Ben is a great leader' },
      ],
      start_time: '08:00:00',
      election_status: ElectionStatus.COMPLETED,
      end_time: '17:00:00',
      start_date: new Date('2023-11-01T00:00:00.000Z'),
      end_date: new Date('2023-11-30T23:59:59.000Z'),
      election_type: ElectionType.SINGLECHOICE,
      max_choices: 1,
    };

    jest.spyOn(electionRepository, 'findOne').mockResolvedValue({
      id: electionId,
      title: 'Original Election Title',
      description: 'Original description.',
      start_date: new Date('2025-05-01T00:00:00Z'),
      end_date: new Date('2025-05-02T00:00:00Z'),
      created_by: 'admin123',
      created_by_user: {} as User,
      candidates: [] as Candidate[],
      votes: [] as Vote[],
      voters: [],
      status: ElectionStatus.COMPLETED,
      vote_id: 'https://vote-link.com',
      start_time: '08:00:00',
      end_time: '17:00:00',
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      type: ElectionType.SINGLECHOICE,
      max_choices: 1,
      email_notification: false,
    });
    jest.spyOn(electionRepository, 'save').mockRejectedValue(new Error('Database connection failed'));

    await expect(service.update(electionId, updateElectionDto)).rejects.toThrow('Database connection failed');
  });
});
