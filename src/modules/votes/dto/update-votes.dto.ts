import { PartialType } from '@nestjs/mapped-types';
import { CreateVoteDto } from './create-votes.dto';

export class UpdateVoteDto extends PartialType(CreateVoteDto) {}
