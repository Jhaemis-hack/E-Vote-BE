export interface MailInterface {
  to: string;

  subject?: string;

  context?: any;

  [key: string]: any;

  template?: string;
}

export interface EmailSender {
  mail: MailInterface;
  template: 'verify-email' | 'reset-password' | 'welcome-email' | 'election-start' | 'election-reminder';
}
