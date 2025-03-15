import { PartialType } from '@nestjs/mapped-types';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDate,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  ValidateIf,
} from 'class-validator';
import { IsAfterDate } from '../../common/validators/is-after-date.validator';
import { ElectionStatus, ElectionType } from '../entities/election.entity';
import { CreateElectionDto } from './create-election.dto';
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

  @ApiProperty({ example: '2025-06-01T00:00:00Z' })
  @IsNotEmpty()
  @IsDate()
  @Type(() => Date)
  start_date: Date;

  @ApiProperty({ example: '2025-06-02T00:00:00Z' })
  @IsNotEmpty()
  @IsDate()
  @Type(() => Date)
  @IsAfterDate('start_date', { message: 'End date must be after start date' })
  end_date: Date;

  @ApiProperty({ example: '09:00:00' })
  @IsNotEmpty()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/, { message: 'start_time must be in the format HH:MM:SS' })
  start_time: string;

  @ApiProperty({
    description: 'This shows the election status',
    example: ElectionStatus.UPCOMING,
    enum: ElectionStatus,
  })
  @IsNotEmpty()
  @IsEnum(ElectionStatus)
  election_status: ElectionStatus;

  @ApiProperty({ example: '10:00:00' })
  @IsNotEmpty()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/, { message: 'end_time must be in the format HH:MM:SS' })
  end_time: string;

  @ApiProperty({ enum: ElectionType, example: ElectionType.SINGLECHOICE })
  @IsNotEmpty()
  @IsEnum(ElectionType)
  election_type: ElectionType;

  @ApiProperty({ example: ['Candidate A', 'Candidate B'], description: 'List of candidate names', type: [String] })
  @IsArray()
  @IsString({ each: true })
  @ValidateIf(candidates => candidates.length > 0)
  @IsNotEmpty({ message: 'Candidates array cannot be empty' })
  candidates: string[];
}
