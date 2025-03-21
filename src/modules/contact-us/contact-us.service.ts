import { Injectable, Inject, forwardRef, HttpStatus } from '@nestjs/common';
import { EmailService } from '../email/email.service';
import * as SYS_MSG from '../../shared/constants/systemMessages';
@Injectable()
export class ContactService {
  constructor(
    @Inject(forwardRef(() => EmailService))
    private readonly emailService: EmailService,
  ) {}

  async handleContactUsSubmission(contactUsDto: any): Promise<any> {
    const { name, email, subject, message } = contactUsDto;

    await this.emailService.sendContactUsEmail(email, name, subject, message);

    return { status_code: HttpStatus.CREATED, message: SYS_MSG.CONTACT_US_SENT_MESSAGE, data: null };
  }
}
