import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDate,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { IsAfterDate } from '../../common/validators/is-after-date.validator';
import { ElectionStatus, ElectionType } from '../entities/election.entity';

export class CreateElectionDto {
  @ApiProperty({ example: 'Presidential Election 2025' })
  @IsNotEmpty()
  @IsString()
  @MinLength(10, { message: 'Title must be at least 10 characters long' })
  @MaxLength(100, { message: 'Title must not be more than 150 characters long.' })
  title: string;

  @ApiProperty({ example: 'Election to choose the next president.' })
  @IsNotEmpty()
  @IsString()
  @MinLength(10, { message: 'Description must be at least 10 characters long' })
  @MaxLength(1000, { message: 'Description must not be more than 500 charaacters long.' })
  description: string;

  @ApiProperty({ example: '2025-06-01' })
  @IsNotEmpty()
  @IsDate()
  @Type(() => Date)
  start_date: Date;

  @ApiProperty({ example: '2025-06-02' })
  @IsNotEmpty()
  @IsDate()
  @Type(() => Date)
  @IsAfterDate('start_date', { message: 'End date must be after start date' })
  end_date: Date;

  @ApiProperty({ example: '09:00:00' })
  @IsNotEmpty()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/, { message: 'start_time must be in the format HH:MM:SS' })
  start_time: string;

  @ApiProperty({ example: '10:00:00' })
  @IsNotEmpty()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/, { message: 'end_time must be in the format HH:MM:SS' })
  end_time: string;

  // @ApiProperty({
  //   description: 'Status of the election',
  //   enum: ElectionStatus,
  //   default: ElectionStatus.PENDING,
  //   example: ElectionStatus.ONGOING,
  // })
  // @IsEnum(ElectionStatus)
  // status?: ElectionStatus;

  @ApiProperty({ enum: ElectionType, example: ElectionType.SINGLECHOICE })
  @IsNotEmpty()
  @IsEnum(ElectionType)
  election_type: ElectionType;

  @ApiProperty({ example: 3, description: 'Maximum number of choices for multiple-choice elections', required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  max_choices?: number;

  @ApiProperty({ example: ['Candidate A', 'Candidate B'], description: 'List of candidate names', type: [String] })
  @IsArray()
  @ArrayMinSize(2, { message: 'Candidates array must contain at least two candidates' })
  @IsString({ each: true, message: 'Each candidate must be a string' })
  @IsNotEmpty({ each: true, message: 'Each candidate must not be empty' })
  candidates: string[];
}
