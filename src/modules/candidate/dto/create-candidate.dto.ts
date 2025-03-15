import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class CreateCandidateDto {
  @ApiProperty({ example: 'Tommy' })
  @IsNotEmpty()
  @IsString()
  @MinLength(2, { message: 'Candidate name must be at least 2 characters long' })
  @MaxLength(100, { message: 'Candidate name must not be more than 100 characters long.' })
  name: string;

  @ApiProperty({ example: 'https://tommy.com' })
  @IsNotEmpty()
  @IsString()
  @Matches(/^https?:\/\/.+$/, { message: 'photo_url must be a valid URL' })
  photo_url: string;
}
