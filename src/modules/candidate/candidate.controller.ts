import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';

import { CandidateService } from './candidate.service';
// import { CreateCandidateDto } from './dto/create-candidate.dto';
import { UpdateCandidateDto } from './dto/update-candidate.dto';

@Controller('candidate')
export class CandidateController {
  constructor(private readonly candiateService: CandidateService) {}

  @Get()
  findAll() {
    return this.candiateService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.candiateService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateCandidateDto) {
    return this.candiateService.update(+id, updateUserDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.candiateService.remove(+id);
  }
}
