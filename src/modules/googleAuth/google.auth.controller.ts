import { Controller, Body, Post, HttpCode } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ApiBody, ApiResponse, ApiBadRequestResponse, ApiTags, ApiOperation } from '@nestjs/swagger';
import { GoogleAuthDto } from './dto/google.auth.dto';
import { skipAuth } from 'src/shared/helpers/skipAuth';
import GoogleAuthPayload from './interfaces/googlePayload';
import { GoogleService } from './google.auth.service';
import { AuthResponseDto } from './dto/auth.response.dto';
@ApiTags('Google Authentication')
@Controller('auth/google')
export class GoogleController {
  constructor(
    private readonly jwtService: JwtService,
    private readonly googleService: GoogleService,
  ) {}

  @skipAuth()
  @Post('google')
  @ApiOperation({ summary: 'Google Authentication' })
  @ApiBody({ type: GoogleAuthDto })
  @ApiResponse({ status: 200, description: 'Verify Payload sent from google', type: AuthResponseDto })
  @ApiBadRequestResponse({ description: 'Google authentication failed' })
  @HttpCode(200)
  async googleAuth(@Body() body: GoogleAuthPayload) {
    return this.googleService.googleAuth(body);
  }
}
