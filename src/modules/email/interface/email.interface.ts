export interface MailInterface {
  to: string;

  subject?: string;

  context?: any;

  [key: string]: any;
}

export interface EmailSender {
  mail: MailInterface;
  // Add 'verify-email' | 'reset-password' | 'welcome-email' | 'election-start' to the template
  template: 'reset-password' | 'welcome-email' | 'election-start' | 'election-monitor';
}
