import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsString } from 'class-validator';

export class CreateVoteDto {
  @ApiProperty({
    description: 'The id of the election',
  })
  @IsString()
  @IsNotEmpty()
  election_id: string;

  @ApiProperty({
    description: 'The id of the candidate',
  })
  @IsNotEmpty()
  @IsArray()
  candidate_id: string[];
}
