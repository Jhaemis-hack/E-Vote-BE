import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { User } from './entities/user.entity';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EmailModule } from '../email/email.module';
import { ForgotPasswordToken } from './entities/forgot-password.entity';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([User, ForgotPasswordToken]),
    forwardRef(() => EmailModule),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('auth.jwtSecret'),
        signOptions: { expiresIn: configService.get<string>('auth.jwtExpiry') },
      }),
    }),
  ],
  providers: [UserService],
  controllers: [UserController],
  exports: [UserService, JwtModule],
})
export class UserModule {}
