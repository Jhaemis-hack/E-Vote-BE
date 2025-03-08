import { ApiProperty } from '@nestjs/swagger';

export class CandidateDto {
  @ApiProperty({ description: 'The name of the candidate', example: 'Jackie Doe' })
  name: string;

  @ApiProperty({ description: 'The number of votes received', example: 3 })
  vote_count: number;
}

export class ElectionDto {
  @ApiProperty({ description: 'The ID of the election', example: 'a5ed5700-2b84-477e-93e0-6cf08398aa7b' })
  id: string;

  @ApiProperty({ description: 'The title of the election', example: 'Presidential Election 2025' })
  title: string;

  @ApiProperty({ description: 'The description of the election', example: 'Election to determine the next president' })
  description: string;

  @ApiProperty({ description: 'The status of the election', example: 'onGoing' })
  status: string;

  @ApiProperty({ description: 'The total casted votes in the election', example: '5' })
  votes_casted: string;

  @ApiProperty({
    description: 'The start date of the election',
    example: '2025-02-15T07:00:00.000Z',
    type: String,
    format: 'date-time',
  })
  start_date: string;
  @ApiProperty({
    description: 'The start time of the election',
    example: '09:00:00',
    type: String,
    format: 'time',
  })
  start_time: string;

  @ApiProperty({
    description: 'The end date of the election',
    example: '2025-02-15T17:00:00.000Z',
    type: String,
    format: 'date-time',
  })
  end_date: string;

  @ApiProperty({
    description: 'The end time of the election',
    example: '09:00:00',
    type: String,
    format: 'time',
  })
  end_time: string;

  @ApiProperty({ description: 'List of candidates and their votes', type: [CandidateDto] })
  candidates: CandidateDto[];
}

export class ElectionDataDto {
  @ApiProperty({ description: 'The election details', type: ElectionDto })
  election: ElectionDto;
}

export class ElectionNotFound {
  @ApiProperty({ description: 'Status code of the response', example: 404 })
  status_code: number;

  @ApiProperty({ description: 'message of the response', example: 'Election not found' })
  message: string;
}

export class SingleElectionResponseDto {
  @ApiProperty({ description: 'Status code of the response', example: 200 })
  status_code: number;

  @ApiProperty({ description: 'Message of the response', example: 'Election fetched successfully' })
  message: string;

  @ApiProperty({ description: 'Election details' })
  data: ElectionDataDto;
}
