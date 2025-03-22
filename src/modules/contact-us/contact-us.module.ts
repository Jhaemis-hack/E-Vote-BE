// contact.module.ts
import { Module, forwardRef } from '@nestjs/common';
import { ContactController } from './contact-us.controller';
import { ContactService } from './contact-us.service';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [forwardRef(() => EmailModule)], // Import EmailModule
  controllers: [ContactController],
  providers: [ContactService],
})
export class ContactModule {}
