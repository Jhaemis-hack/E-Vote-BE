import { ApiProperty } from '@nestjs/swagger';

export class VoteLinkResponseDto {
  @ApiProperty({ description: 'Unique identifier of the voter link', example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ description: 'The election ID associated with this voter link', example: 'election-123' })
  election_id: string;

  @ApiProperty({ description: 'Unique link generated for voting', example: 'https://your-app.com/vote/unique-link-id' })
  unique_link: string;

  @ApiProperty({ description: 'Timestamp when the voter link was created', example: '2024-02-13T12:00:00.000Z' })
  created_at: Date;

  @ApiProperty({ description: 'Timestamp when the voter link was last updated', example: '2024-02-14T12:00:00.000Z' })
  updated_at: Date;
}
