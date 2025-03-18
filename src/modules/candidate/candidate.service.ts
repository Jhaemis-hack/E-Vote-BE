import { Injectable } from '@nestjs/common';
import { UpdateCandidateDto } from './dto/update-candidate.dto';

@Injectable()
export class CandidateService {
  findAll() {
    return `This action returns all candidate`;
  }

  findOne(id: number) {
    return `This action returns a #${id} candidate`;
  }

  update(id: number, updateUserDto: UpdateCandidateDto) {
    // Use updateUserDto to update the candidate
    return `This action updates a #${id} candidate with data: ${JSON.stringify(updateUserDto)}`;
  }

  remove(id: number) {
    return `This action removes a #${id} candidate`;
  }
}
