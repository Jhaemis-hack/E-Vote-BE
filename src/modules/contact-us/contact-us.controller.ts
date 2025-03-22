import { Body, Controller, Post, UsePipes, ValidationPipe } from '@nestjs/common';
import { ContactUsDto } from './dto/contact-us.dto';
import { ContactService } from './contact-us.service';

import { ApiTags } from '@nestjs/swagger';

@ApiTags('Contact Us')
@Controller('contact-us')
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @Post('')
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  )
  async submitContactUs(@Body() contactUsDto: ContactUsDto) {
    return await this.contactService.handleContactUsSubmission(contactUsDto);
  }
}
