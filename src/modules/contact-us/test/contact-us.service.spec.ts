import { Test, TestingModule } from '@nestjs/testing';
import { ContactService } from '../contact-us.service';
import { EmailService } from '../../email/email.service';
import _default from 'uuid/dist/cjs/max';

describe('ContactService', () => {
  let contactService: ContactService;
  let _: EmailService;

  const mockEmailService = {
    sendContactUsEmail: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContactService,
        {
          provide: EmailService,
          useValue: mockEmailService,
        },
      ],
    }).compile();

    contactService = module.get<ContactService>(ContactService);
    _ = module.get<EmailService>(EmailService);
  });

  it('should be defined', () => {
    expect(contactService).toBeDefined();
  });

  describe('handleContactUsSubmission', () => {
    it('should send a contact us email and return success', async () => {
      const contactUsDto = {
        name: 'John Doe',
        email: 'johndoe@example.com',
        subject: 'Test Subject',
        message: 'This is a test message.',
      };

      mockEmailService.sendContactUsEmail.mockResolvedValueOnce(true);

      const result = await contactService.handleContactUsSubmission(contactUsDto);

      expect(mockEmailService.sendContactUsEmail).toHaveBeenCalledWith(
        contactUsDto.email,
        contactUsDto.name,
        contactUsDto.subject,
        contactUsDto.message,
      );

      expect(result).toEqual({
        status_code: 201,
        message: 'Thank you for reaching out. We will respond shortly.',
        data: null,
      });
    });

    it('should throw an error if sending email fails', async () => {
      const contactUsDto = {
        name: 'Jane Doe',
        email: 'janedoe@example.com',
        subject: 'Failed Test',
        message: 'This is a failed test message.',
      };

      mockEmailService.sendContactUsEmail.mockRejectedValueOnce(new Error('Email send failed'));

      await expect(contactService.handleContactUsSubmission(contactUsDto)).rejects.toThrow('Email send failed');

      expect(mockEmailService.sendContactUsEmail).toHaveBeenCalledWith(
        contactUsDto.email,
        contactUsDto.name,
        contactUsDto.subject,
        contactUsDto.message,
      );
    });

    it('should throw an error for invalid input', async () => {
      const invalidContactUsDto = {
        name: 'John Doe',
        email: 'invalid-email',
        subject: 'Test Subject',
        message: '', // Empty message
      };

      await expect(contactService.handleContactUsSubmission(invalidContactUsDto)).rejects.toThrow('Invalid input');
    });

    it('should reject unwanted data in the input', async () => {
      const unwantedDataDto = {
        name: 'John Doe',
        email: 'johndoe@example.com',
        subject: 'Test Subject',
        message: 'This is a test message.',
        extraField: 'Unwanted Data', // Extra field not allowed
      };

      await expect(contactService.handleContactUsSubmission(unwantedDataDto as any)).rejects.toThrow(
        'Unwanted data detected',
      );
    });
  });
});
