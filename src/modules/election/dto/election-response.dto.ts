import { ApiProperty } from '@nestjs/swagger';
import { ElectionType } from '../entities/election.entity';

export class ElectionResponseDto {
  @ApiProperty({ description: 'The ID of the election', example: '550e8400-e29b-41d4-a716-446655440000' })
  election_id: string;

  @ApiProperty({ description: 'The title of the election', example: '2023 Presidential Election' })
  title: string;

  @ApiProperty({
    description: 'The description of the election',
    example: 'Election to choose the next president of the country',
  })
  description: string;

  @ApiProperty({ description: 'The start date of the election', example: '2023-10-01T00:00:00.000Z' })
  start_date: Date;

  @ApiProperty({ description: 'The end date of the election', example: '2023-10-31T23:59:59.000Z' })
  end_date: Date;

  @ApiProperty({ description: 'This uuid is used to acesss this election by a voter.' })
  vote_link: string;

  @ApiProperty({
    description: 'The type of the election',
    enum: ElectionType, // Use the enum here
    example: ElectionType.SINGLECHOICE, // Provide an example
  })
  election_type: ElectionType;

  @ApiProperty({
    description: 'The ID of the user who created the election',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  created_by: string;

  @ApiProperty({ example: ['Candidate A', 'Candidate B'], type: [String] })
  candidates: string[];
}
