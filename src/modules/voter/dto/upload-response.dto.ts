import { ApiProperty } from '@nestjs/swagger';

export class VoterUploadResponseDto {
  @ApiProperty({ description: 'HTTP status code of the response', example: 201 })
  status_code: number;

  @ApiProperty({
    description: 'Message describing the result of the operation',
    example: 'Voters uploaded successfully',
  })
  message: string;

  @ApiProperty({ description: 'Additional data if available, otherwise null', example: null, nullable: true })
  data: any;
}

export class VoterUploadErrorDto {
  @ApiProperty({ description: 'HTTP status code of the response', example: 400 })
  status_code: number;

  @ApiProperty({ description: 'Error message detailing the issue', example: 'Invalid file format' })
  message: string;

  @ApiProperty({ description: 'Additional error details if available, otherwise null', example: null, nullable: true })
  data: any;
}

export class DuplicateEmailsErrorDto {
  @ApiProperty({ description: 'HTTP status code of the response', example: 409 })
  status_code: number;

  @ApiProperty({ description: 'Error message detailing the issue', example: 'Duplicate emails found' })
  message: string;

  @ApiProperty({
    description: 'List of duplicate emails with the rows they appear in',
    example: [
      { email: 'user@example.com', rows: [2, 5] },
      { email: 'test@example.com', rows: [3, 6] },
    ],
  })
  data: { email: string; rows: number[] }[];
}
