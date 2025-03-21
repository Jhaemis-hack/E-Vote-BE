import { PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @ApiProperty({
    description: 'The email address of the user',
    example: 'user@example.com',
  })
  @IsOptional()
  @IsEmail({}, { message: 'Invalid email format' })
  email?: string;

  @ApiProperty({
    description: 'The password for the user account',
    example: 'p@ssw0rd!',
    minLength: 8,
  })
  @IsOptional()
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  password?: string;

  @ApiProperty({
    description: 'profile picture url',
    example: 'https://from-s3-bucket.com',
  })
  @IsOptional()
  @IsString()
  profile_picture?: string
}
