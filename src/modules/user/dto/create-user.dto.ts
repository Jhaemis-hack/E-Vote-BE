import { IsEmail, IsEnum, IsNotEmpty, MinLength, IsBoolean, IsOptional } from 'class-validator';
import { UserType } from '../entities/user.entity';

export class CreateUserDto {
  @IsNotEmpty()
  first_name: string;

  @IsNotEmpty()
  last_name: string;

  @IsEmail()
  email: string;

  @MinLength(6)
  password: string;

  @IsOptional()
  @IsBoolean()
  verified?: boolean;

  @IsOptional()
  @IsEnum(UserType)
  user_type?: UserType;
}
