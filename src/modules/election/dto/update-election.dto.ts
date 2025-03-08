import { PartialType } from '@nestjs/mapped-types';
import { CreateElectionDto } from './create-election.dto';
import { IsOptional, IsDateString, ValidateIf, IsEnum, IsString, IsArray, IsNotEmpty, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ElectionType, ElectionStatus } from '../entities/election.entity';

export class UpdateElectionDto extends PartialType(CreateElectionDto) {
  @ApiProperty({
    example: 'Updated Election Title',
    description: 'The updated title of the election',
  })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({
    example: 'This is an updated description.',
    description: 'The updated description of the election',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    example: '2025-06-01T00:00:00Z',
    description: 'The updated start date of the election',
  })
  @IsOptional()
  @IsDateString()
  start_date?: Date;

  @ApiProperty({
    example: '2025-06-02T00:00:00Z',
    description: 'The updated end date of the election',
  })
  @IsOptional()
  @IsDateString()
  @ValidateIf(o => o.start_date) // Validate end_date only if start_date is provided
  end_date?: Date;

  @ApiProperty({ example: '09:00:00' })
  @IsNotEmpty()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/, { message: 'start_time must be in the format HH:MM:SS' })
  start_time: string;

  @ApiProperty({ example: '10:00:00' })
  @IsNotEmpty()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/, { message: 'end_time must be in the format HH:MM:SS' })
  end_time: string;

  @ApiProperty({
    description: 'Status of the election',
    enum: ElectionStatus,
    default: ElectionStatus.ONGOING,
    example: ElectionStatus.ONGOING,
  })
  @IsEnum(ElectionStatus)
  status: ElectionStatus;

  @ApiProperty({
    example: ElectionType.SINGLECHOICE,
    description: 'The updated type of the election',
    enum: ElectionType,
  })
  @IsOptional()
  @IsEnum(ElectionType)
  electionType?: ElectionType;

  @ApiProperty({ example: ['Candidate A', 'Candidate B'], description: 'List of candidate names', type: [String] })
  @IsArray()
  @IsString({ each: true })
  @ValidateIf(candidates => candidates.length > 0)
  @IsNotEmpty({ message: 'Candidates array cannot be empty' })
  candidates: string[];
}
