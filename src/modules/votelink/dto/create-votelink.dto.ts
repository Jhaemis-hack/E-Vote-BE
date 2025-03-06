import { IsString, IsUUID } from 'class-validator';

export class CreateVoteLinkDto {
  @IsUUID()
  election_id: string;
}
