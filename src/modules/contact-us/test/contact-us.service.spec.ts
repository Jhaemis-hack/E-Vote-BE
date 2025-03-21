import { Test, TestingModule } from '@nestjs/testing';
import { ContactService } from '../contact-us.service';
import { EmailService } from '../../email/email.service';

describe('ContactService', () => {
  let contactService: ContactService;
  let emailService: EmailService;

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
    emailService = module.get<EmailService>(EmailService);
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

      // Mock the behavior of the EmailService
      mockEmailService.sendContactUsEmail.mockResolvedValueOnce(true);

      const result = await contactService.handleContactUsSubmission(contactUsDto);

      expect(mockEmailService.sendContactUsEmail).toHaveBeenCalledWith(
        contactUsDto.email,
        contactUsDto.name,
        contactUsDto.subject,
        contactUsDto.message,
      );

      expect(result).toEqual({
        success: true,
        message: 'Thank you for reaching out. We will respond shortly.',
      });
    });

    it('should throw an error if sending email fails', async () => {
      const contactUsDto = {
        name: 'Jane Doe',
        email: 'janedoe@example.com',
        subject: 'Failed Test',
        message: 'This is a failed test message.',
      };

      // Mock the behavior of the EmailService to throw an error
      mockEmailService.sendContactUsEmail.mockRejectedValueOnce(new Error('Email send failed'));

      await expect(contactService.handleContactUsSubmission(contactUsDto)).rejects.toThrow('Email send failed');

      expect(mockEmailService.sendContactUsEmail).toHaveBeenCalledWith(
        contactUsDto.email,
        contactUsDto.name,
        contactUsDto.subject,
        contactUsDto.message,
      );
    });
  });
});
