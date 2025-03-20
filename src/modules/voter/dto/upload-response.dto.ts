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
  @ApiProperty({ description: 'HTTP status code of the response', example: 400 })
  status_code: number;

  @ApiProperty({
    description: 'Error message detailing the duplicate emails found',
    example:
      'Oops! The following emails are already in use: johndoe@example.com, janesmith@example.com, alice@example.com, bobw@example.com, charlie.b@example.com, davidc@example.com, emmaw@example.com, frankh@example.com, gracel@example.com, henrys@example.com. Please use unique emails.',
  })
  message: string;
}
