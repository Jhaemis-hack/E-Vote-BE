import { ApiProperty } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray, IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class CreateVoteDto {
  @ApiProperty({
    description: 'The id of the candidate',
  })
  @IsNotEmpty()
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  candidate_id: string[];
}
