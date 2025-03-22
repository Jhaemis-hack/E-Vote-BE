import { IsEmail, IsNotEmpty, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ContactUsDto {
  @ApiProperty({
    description: 'The name of the user sending the message',
    example: 'John Doe',
    minLength: 2,
    maxLength: 50,
  })
  @IsNotEmpty()
  @Length(2, 50)
  name: string;

  @ApiProperty({
    description: 'The email address of the user',
    example: 'johndoe@example.com',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'The subject of the message',
    example: 'Request for Information',
    minLength: 5,
    maxLength: 100,
  })
  @IsNotEmpty()
  @Length(5, 100)
  subject: string;

  @ApiProperty({
    description: 'The message content',
    example: 'I would like to know more about your services.',
    minLength: 10,
    maxLength: 500,
  })
  @IsNotEmpty()
  @Length(10, 500)
  message: string;
}
