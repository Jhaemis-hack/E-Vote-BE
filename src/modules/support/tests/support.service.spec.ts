import { Test, TestingModule } from '@nestjs/testing';
import { SupportService } from '../support.service';
import { EmailService } from '../../email/email.service';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../../user/entities/user.entity';
import { SupportTemplateDto } from '../dto/support.dto';
import { HttpException, HttpStatus } from '@nestjs/common';
import * as SYS_MSG from '../../../shared/constants/systemMessages';

describe('SupportService', () => {
  let service: SupportService;
  let emailService: EmailService;
  let userRepository: Repository<User>;

  beforeEach(async () => {
    const mockUserRepository = {
      findOne: jest.fn(),
    };

    const mockEmailService = {
      sendSupportEmails: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SupportService,
        {
          provide: EmailService,
          useValue: mockEmailService,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
      ],
    }).compile();

    service = module.get<SupportService>(SupportService);
    emailService = module.get<EmailService>(EmailService);
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('SendSupportMessage', () => {
    it('should send message to the support team by an authenticated user', async () => {
      const supportMessageDto: SupportTemplateDto = {
        message: 'This is a support message to the resolve support team !',
      };

      const mockUser = {
        email: 'John@gmail.com',
        first_name: 'John',
        last_name: 'DOe',
      };

      const mockMailDetail = {
        message: supportMessageDto.message,
        first_name: mockUser.first_name,
        last_name: mockUser.last_name,
        email: mockUser.email,
      };

      userRepository.findOne = jest.fn().mockResolvedValue(mockUser);

      emailService.sendSupportEmail = jest.fn().mockResolvedValue(mockMailDetail);

      const result = await service.sendSupportMessage(supportMessageDto, mockUser.email);

      expect(emailService.sendSupportEmail).toHaveBeenCalledWith(mockMailDetail);

      expect(result).toEqual({
        status_code: HttpStatus.OK,
        message: SYS_MSG.SUPPORT_MESSAGE_SENT,
        data: null,
      });
    });

    it('should throw UNAUTHORIZED error if user in not authenticated !', async () => {
      const mockUser = {
        first_name: 'John',
        last_name: 'DOe',
        email: 'John@gmail.com',
      } as User;

      const supportMessageDto: SupportTemplateDto = {
        message: 'This is a support message to the resolve support team !',
      };

      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);

      await expect(service.sendSupportMessage(supportMessageDto, mockUser.email)).rejects.toThrow(
        new HttpException(
          {
            status_code: HttpStatus.UNAUTHORIZED,
            message: SYS_MSG.USER_NOT_FOUND,
            data: null,
          },
          HttpStatus.UNAUTHORIZED,
        ),
      );
    });
  });
});
