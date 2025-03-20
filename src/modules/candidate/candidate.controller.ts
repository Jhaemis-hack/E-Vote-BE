import { Controller, Patch, Param, UploadedFile, UseInterceptors } from '@nestjs/common';

import { CandidateService } from './candidate.service';
// import { CreateCandidateDto } from './dto/create-candidate.dto';

import { ApiTags, ApiOperation, ApiParam, ApiResponse, ApiBody, ApiConsumes } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';

@ApiTags('Candidate') // Group the endpoints under the "Candidate" tag
@Controller('candidate')
export class CandidateController {
  constructor(private readonly candidateService: CandidateService) {}

  // @Get()
  // findAll() {
  //   return this.candidateService.findAll();
  // }

  // @Get(':id')
  // findOne(@Param('id') id: string) {
  //   return this.candidateService.findOne(+id);
  // }

  @Patch(':id/photo')
  @ApiOperation({ summary: "Update a candidate's photo" })
  @ApiParam({ name: 'id', description: 'Candidate ID', type: String })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'successfully Updated Profile URL' })
  @ApiResponse({ status: 404, description: 'Candidate not found' })
  @UseInterceptors(FileInterceptor('file'))
  async updatePhoto(@Param('id') id: string, @UploadedFile() file: Express.Multer.File) {
    return this.candidateService.updatePhoto(id, file);
  }

  // @Delete(':id')
  // remove(@Param('id') id: string) {
  //   return this.candidateService.remove(+id);
  // }
}
