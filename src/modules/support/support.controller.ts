import { Body, Controller, HttpCode, HttpStatus, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SupportTemplateDto } from './dto/support.dto';
import { SupportService } from './support.service';
import { AuthGuard } from 'src/guards/auth.guard';
import * as SYS_MSG from '../../shared/constants/systemMessages';

ApiTags();
@Controller('support')
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  @ApiBearerAuth()
  @Post()
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send a support message to resolve team.' })
  @ApiResponse({ status: 200, description: SYS_MSG.SUPPORT_MESSAGE_SENT, type: SupportTemplateDto })
  @ApiResponse({ status: 401, description: SYS_MSG.USER_NOT_FOUND })
  async createMessage(@Body() supportDto: SupportTemplateDto, @Req() req: any) {
    const admin_email = req.user.email;
    return this.supportService.sendSupportMessage(supportDto, admin_email);
  }
}
