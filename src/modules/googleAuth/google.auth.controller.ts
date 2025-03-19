import { Controller, Body, Get, Post, HttpCode, Req, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Response } from 'express';
import { JwtService } from '@nestjs/jwt';
import { ApiBody, ApiResponse, ApiBadRequestResponse, ApiTags, ApiOperation, ApiOkResponse } from '@nestjs/swagger';
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

  @Get()
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Initiates Google OAuth login' })
  async googleAuth2() {
    // Initiates the Google OAuth2 login flow
  }

  @Get('callback')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Handles Google OAuth callback' })
  @ApiOkResponse({
    description: 'User successfully authenticated via Google',
    type: GoogleAuthDto,
  })
  async googleAuthRedirect(@Req() req, @Res() res: Response) {
    const user = req.user;

    const payload = { sub: user.id, email: user.email };
    const token = this.jwtService.sign(payload);

    // Redirect to frontend with token
    return res.redirect(`${process.env.FRONTEND_URL}/auth/success?token=${token}`);
  }
}
