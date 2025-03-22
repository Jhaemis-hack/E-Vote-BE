import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SupportTemplateDto } from './dto/support.dto';
import * as SYS_MSG from '../../shared/constants/systemMessages';
import { User } from '../user/entities/user.entity';
import { EmailService } from '../email/email.service';

@Injectable()
export class SupportService {
  constructor(
    @InjectRepository(User) private userRepository: Repository<User>,
    private readonly mailService: EmailService,
  ) {}

  async sendSupportMessage(
    supportMessageDto: SupportTemplateDto,
    admin_email: string,
  ): Promise<{
    status_code: number;
    message: string;
    data: null;
  }> {
    const admin_exist = await this.userRepository.findOne({ where: { email: admin_email } });
    const { message } = supportMessageDto;

    if (!admin_exist) {
      throw new HttpException(
        {
          status_code: HttpStatus.UNAUTHORIZED,
          message: SYS_MSG.USER_NOT_FOUND,
          data: null,
        },
        HttpStatus.UNAUTHORIZED,
      );
    }

    const mailDetail = {
      first_name: admin_exist.first_name,
      last_name: admin_exist.last_name,
      email: admin_exist.email,
      message: message,
    };

    try {
      await this.mailService.sendSupportEmail(mailDetail);
    } catch (error) {
      console.log(error);
      return {
        status_code: HttpStatus.INTERNAL_SERVER_ERROR,
        message: SYS_MSG.SUPPORT_MESSAGE_NOT_SENT,
        data: null,
      };
    }

    return {
      status_code: HttpStatus.OK,
      message: SYS_MSG.SUPPORT_MESSAGE_SENT,
      data: null,
    };
  }
}
