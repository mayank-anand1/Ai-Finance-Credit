import { GeneratedEmail } from './services/geminiService';

export enum EscalationStage {
  STAGE_1 = 1,
  STAGE_2 = 2,
  STAGE_3 = 3,
  STAGE_4 = 4,
  ESCALATED = 5,
}

export interface EscalationInfo {
  stage: EscalationStage;
  tone: string;
  description: string;
  overdueDays: number;
}

export interface Invoice {
  invoice_no: string;
  client_name: string;
  amount: number;
  due_date: string;
  email: string;
  followup_count: number;
  payment_link: string;
  escalation?: EscalationInfo;
}

export interface ProcessedEmail extends GeneratedEmail {
  invoice: Invoice;
  status: 'pending' | 'sent' | 'error' | 'sending' | 'failed';
  timestamp: Date;
  progress?: number;
  error_reason?: string;
}
