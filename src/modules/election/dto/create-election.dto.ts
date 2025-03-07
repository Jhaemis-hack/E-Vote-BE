import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsDate, IsEnum, IsNotEmpty, IsString, ValidateIf } from 'class-validator';
import { Type } from 'class-transformer';
import { IsAfterDate } from '../../common/validators/is-after-date.validator';
import { ElectionStatus, ElectionType } from '../entities/election.entity';

export class CreateElectionDto {
  @ApiProperty({ example: 'Presidential Election 2025' })
  @IsNotEmpty()
  @IsString()
  title: string;

  @ApiProperty({ example: 'Election to choose the next president.' })
  @IsNotEmpty()
  @IsString()
  description: string;

  @ApiProperty({ example: '2025-06-01T00:00:00Z' })
  @IsNotEmpty()
  @IsDate()
  @Type(() => Date)
  startDate: Date;

  @ApiProperty({ example: '2025-06-02T00:00:00Z' })
  @IsNotEmpty()
  @IsDate()
  @Type(() => Date)
  @IsAfterDate('startDate', { message: 'End date must be after start date' })
  endDate: Date;

  @ApiProperty({ example: '09:00:00' })
  @IsNotEmpty()
  start_time: string;

  @ApiProperty({ example: '10:00:00' })
  @IsNotEmpty()
  end_time: string;

  @ApiProperty({
    description: 'Status of the election',
    enum: ElectionStatus,
    default: ElectionStatus.ONGOING,
    example: ElectionStatus.ONGOING,
  })
  @IsEnum(ElectionStatus)
  status: ElectionStatus;

  @ApiProperty({ enum: ElectionType, example: ElectionType.SINGLECHOICE })
  @IsNotEmpty()
  @IsEnum(ElectionType)
  electionType: ElectionType;

  @ApiProperty({ example: ['Candidate A', 'Candidate B'], description: 'List of candidate names', type: [String] })
  @IsArray()
  @IsString({ each: true })
  @ValidateIf(candidates => candidates.length > 0)
  @IsNotEmpty({ message: 'Candidates array cannot be empty' })
  candidates: string[];
}
