import { IsBoolean } from 'class-validator';

export class NotificationSettingsDto {
  @IsBoolean()
  email_notification: boolean;
}
