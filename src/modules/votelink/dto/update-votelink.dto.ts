import { PartialType } from '@nestjs/mapped-types';
import { CreateVoteLinkDto } from './create-votelink.dto';

export class UpdateVoteLinkDto extends PartialType(CreateVoteLinkDto) {}
