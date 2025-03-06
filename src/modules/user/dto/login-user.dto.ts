import { IsEmail, IsNotEmpty, MinLength } from 'class-validator';
export class LoginDto {
  @IsNotEmpty({ message: 'Email is required' })
  @IsEmail({}, { message: 'Please provide a valid email.' })
  email: string;

  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(6, { message: 'Password minimum character should be 6.' })
  password: string;
}
