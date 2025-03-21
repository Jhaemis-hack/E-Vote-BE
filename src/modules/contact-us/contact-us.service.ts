import { Injectable, Inject, forwardRef, HttpStatus, BadRequestException } from '@nestjs/common';
import { EmailService } from '../email/email.service';
import * as SYS_MSG from '../../shared/constants/systemMessages';

@Injectable()
export class ContactService {
  constructor(
    @Inject(forwardRef(() => EmailService))
    private readonly emailService: EmailService,
  ) {}

  async handleContactUsSubmission(contactUsDto: any): Promise<any> {
    const requiredFields = ['name', 'email', 'subject', 'message'];
    const dtoKeys = Object.keys(contactUsDto);

    // Check for invalid fields
    const hasUnwantedData = dtoKeys.some(key => !requiredFields.includes(key));
    if (hasUnwantedData) {
      throw new BadRequestException('Unwanted data detected');
    }

    const { name, email, subject, message } = contactUsDto;

    // Validate required fields
    if (!name || !email || !subject || !message) {
      throw new BadRequestException('Invalid input');
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new BadRequestException('Invalid input');
    }

    await this.emailService.sendContactUsEmail(email, name, subject, message);

    return { status_code: HttpStatus.CREATED, message: SYS_MSG.CONTACT_US_SENT_MESSAGE, data: null };
  }
}
