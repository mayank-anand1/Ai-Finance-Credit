import { useState, useCallback } from 'react';
import { SafeMailer } from '../services/mailer';
import { Invoice, ProcessedEmail } from '../types';

export function useEmailDispatcher(isDryRun: boolean) {
  const [emails, setEmails] = useState<ProcessedEmail[]>([]);

  const updateEmail = useCallback((invoiceNo: string, updates: Partial<ProcessedEmail>) => {
    setEmails(prev => prev.map(e => 
      e.invoice.invoice_no === invoiceNo ? { ...e, ...updates } : e
    ));
  }, []);

  const dispatchEmail = useCallback(async (
    email: ProcessedEmail, 
    onSuccess?: (email: ProcessedEmail) => Promise<void>
  ) => {
    const invoiceNo = email.invoice.invoice_no;

    try {
      // 1. Initial Sending State
      updateEmail(invoiceNo, { status: 'sending', progress: 10, error_reason: undefined });

      // 2. Simulate progress for UI feedback
      const progressInterval = setInterval(() => {
        setEmails(prev => prev.map(e => {
          if (e.invoice.invoice_no === invoiceNo && e.status === 'sending' && (e.progress || 0) < 90) {
            return { ...e, progress: Math.min(90, (e.progress || 0) + Math.random() * 15) };
          }
          return e;
        }));
      }, 400);

      const mailer = new SafeMailer(isDryRun);
      const result = await mailer.sendEmail({
        to: email.invoice.email,
        from: 'recovery@creditflow.ai',
        subject: email.subject,
        body: email.body
      });

      clearInterval(progressInterval);

      if (result.success) {
        updateEmail(invoiceNo, { status: 'sent', progress: 100 });
        if (onSuccess) await onSuccess(email);
        return { success: true };
      } else {
        updateEmail(invoiceNo, { 
          status: 'failed', 
          progress: 0, 
          error_reason: result.message 
        });
        return { success: false, message: result.message };
      }
    } catch (error) {
      console.error('Dispatch error:', error);
      const msg = error instanceof Error ? error.message : 'Unknown error';
      updateEmail(invoiceNo, { 
        status: 'failed', 
        progress: 0, 
        error_reason: msg 
      });
      return { success: false, message: msg };
    }
  }, [updateEmail, isDryRun]);

  return {
    emails,
    setEmails,
    dispatchEmail,
    updateEmail
  };
}
