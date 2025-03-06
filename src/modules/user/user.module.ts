import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    JwtModule.register({
      secret: process.env.JWT_SECRET_KEY || 'yourDefaultSecret',
      signOptions: { expiresIn: process.env.JWT_EXPIRY || '1d' },
    }),
  ],

  controllers: [UserController],
  providers: [UserService],
})
export class UserModule {}
