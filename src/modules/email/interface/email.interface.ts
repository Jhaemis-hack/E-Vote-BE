export interface MailInterface {
  to: string;

  subject?: string;

  context?: any;

  [key: string]: any;

  template?: string;
}

export interface EmailSender {
  mail: MailInterface;
  template:
    | 'reset-password'
    | 'welcome-email'
    | 'election-start'
    | 'election-monitor'
    | 'election-reminder'
    | 'election-creation'
    | 'voter-invite'
    | 'election-results';
}
