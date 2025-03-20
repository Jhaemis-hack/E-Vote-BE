import { BadRequestException, Injectable, InternalServerErrorException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../user/entities/user.entity';
import * as SYS_MSG from '../../shared/constants/systemMessages';
import GoogleAuthPayload from './interfaces/googlePayload';
import { HttpStatus, HttpException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
@Injectable()
export class GoogleService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private jwtService: JwtService,
  ) {}

  async googleAuth(googleAuthPayload: GoogleAuthPayload) {
    const idToken = googleAuthPayload.id_token;

    if (!idToken) {
      throw new HttpException(
        {
          status_code: HttpStatus.UNAUTHORIZED,
          message: SYS_MSG.INVALID_CREDENTIALS,
          data: null,
        },
        HttpStatus.UNAUTHORIZED,
      );
    }

    const request = await fetch(`https://www.googleapis.com/oauth2/v3/tokeninfo?id_token=${idToken}`);

    if (request.status === 400) {
      throw new HttpException(
        {
          status_code: HttpStatus.UNAUTHORIZED,
          message: SYS_MSG.INVALID_CREDENTIALS,
          data: null,
        },
        HttpStatus.UNAUTHORIZED,
      );
    }

    if (request.status === 500) {
      throw new HttpException(
        {
          status_code: HttpStatus.INTERNAL_SERVER_ERROR,
          message: SYS_MSG.SERVER_ERROR,
          data: null,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    const verifyTokenResponse = await request.json();

    const userEmail = verifyTokenResponse.email;
    let user = await this.usersRepository.findOne({
      where: { email: userEmail },
    });

    if (!user) {
      const userPayload = {
        email: userEmail,
        first_name: verifyTokenResponse.given_name || '',
        last_name: verifyTokenResponse?.family_name || '',
        password: '',
        profile_picture: verifyTokenResponse?.picture || '',
        is_verified: true,
      };

      user = this.usersRepository.create(userPayload);
      await this.usersRepository.save(user);
    }

    const token = this.jwtService.sign({
      sub: user.id,
      email: user.email,
    });

    return {
      message: SYS_MSG.GOOGLE_AUTH_RESPONSE,
      data: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        profile_picture: user.profile_picture,
        token,
      },
    };
  }
}
