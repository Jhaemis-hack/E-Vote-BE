import { Controller, Get, Req, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Response } from 'express';
import { JwtService } from '@nestjs/jwt';
import { ApiTags, ApiOperation, ApiOkResponse } from '@nestjs/swagger';
import { GoogleAuthDto } from './dto/google.auth.dto';
@ApiTags('Google Authentication')
@Controller('auth/google')
export class GoogleController {
  constructor(private readonly jwtService: JwtService) {}

  @Get()
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Initiates Google OAuth login' })
  async googleAuth() {
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
