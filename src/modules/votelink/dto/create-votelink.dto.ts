import { IsString, IsUUID, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateVoteLinkDto {
  @ApiProperty({
    description: 'The ID of the election for which the vote link is being created',
    example: '550e8400-e29b-41d4-a716-446655440000', // Example UUID
  })
  @IsUUID()
  election_id: string;

  @ApiProperty({
    description: 'A unique link for voting (optional)',
    example: 'https://example.com/vote/abc123',
    required: false,
  })
  @IsOptional()
  @IsString()
  unique_link?: string;
}
