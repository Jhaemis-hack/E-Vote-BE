import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class UpdateCandidateDto {
  @ApiProperty({
    example: 'https://newphoto.com',
    description: 'The new photo URL for the candidate',
  })
  @IsNotEmpty()
  @IsString()
  @Matches(/^https?:\/\/.+$/, { message: 'photo_url must be a valid URL' })
  photo_url: string;
}
