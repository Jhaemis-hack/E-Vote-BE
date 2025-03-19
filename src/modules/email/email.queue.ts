import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { EmailSender } from './interface/email.interface';

@Injectable()
export class EmailQueue {
  constructor(@InjectQueue('emailQueue') private readonly emailQueue: Queue) {}

  async sendEmail({ mail, template }: EmailSender) {
    const emailJob = await this.emailQueue.add(
      template,
      { mail },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 3000,
        },
        removeOnComplete: true,
        removeOnFail: false,
      },
    );
    return emailJob;
  }
}
