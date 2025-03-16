import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  MinLength,
  IsString,
  IsStrongPassword,
  IsBoolean,
  Matches,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  //TODO:
  // @ApiProperty({
  //   description: 'The first name of the user',
  //   example: 'John',
  // })
  // @IsNotEmpty()
  // @IsString()
  // first_name: string;

  // @ApiProperty({
  //   description: 'The last name of the user',
  //   example: 'Doe',
  // })
  // @IsNotEmpty()
  // @IsString()
  // last_name: string;

  @ApiProperty({
    description: 'The email address of the user',
    example: 'user@example.com',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'The password for the user account',
    example: 'P@ssw0rd!',
    minLength: 8,
  })
  @MinLength(8)
  @IsNotEmpty()
  @Matches(/(?=.*\d)(?=.*[!@#$%^&*])/, {
    message: 'password must be at least 8 characters long and contain at least one number and one special character',
  })
  password: string;
}
