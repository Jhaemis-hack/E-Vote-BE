import { IsInt, Min, IsOptional } from 'class-validator';

export class GetVoteLinkDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  page: number;

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
