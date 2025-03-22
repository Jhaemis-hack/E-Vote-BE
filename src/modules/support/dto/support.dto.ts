import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString } from 'class-validator';

export class SupportTemplateDto {
  @ApiProperty({
    description: 'The content of the inquiry',
    example: 'The reason for making inquiry to resolve',
  })
  @IsString()
  message: string;
}
