import { IsInt, Min, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GetVoteLinkDto {
  @ApiProperty({
    description: 'The page number for pagination',
    example: 1,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  page: number;

  @ApiProperty({
    description: 'The number of items per page',
    example: 10,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  limit: number;

  constructor(page: number = 1, limit: number = 10) {
    this.page = page;
    this.limit = limit;
  }

  static fromQuery(query: any): GetVoteLinkDto {
    const { page = 1, limit = 10 } = query;
    return new GetVoteLinkDto(Number(page), Number(limit));
  }
}
