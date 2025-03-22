import { IsEmail, MinLength, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangePasswordDto {
  @ApiProperty({
    description: 'User old password for authentication',
    example: 'p@ssw0rd!',
    minLength: 6,
  })
  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(6, { message: 'Password minimum character should be 6.' })
  old_password: string;

  @ApiProperty({
    description: 'User new password',
    example: 'P@ssw0rd!',
    minLength: 6,
  })
  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(6, { message: 'Password minimum character should be 6.' })
  new_password: string;
}
