import { IsEmail, IsNotEmpty } from 'class-validator';
export class LoginDto {
  @IsNotEmpty({ message: 'Email is required' })
  @IsEmail({}, { message: 'Please provide a valid email.' })
  email: string;

  @IsNotEmpty({ message: 'Password is required' })
  password: string;
}
