import { Injectable } from '@nestjs/common';
import { EmailQueue } from './email.queue';

@Injectable()
export class EmailService {
  constructor(private emailQueue: EmailQueue) {}
}
