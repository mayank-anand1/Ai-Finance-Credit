/**
 * Email Spoofing Mitigation: 
 * Implement a 'Safe Mailer' class that includes a 'dry-run' mode for testing.
 * Documentation regarding SPF/DKIM/DMARC is provided within the code.
 */

export interface MailOptions {
  to: string;
  from: string;
  subject: string;
  body: string;
}

/**
 * SECURITY NOTICE:
 * To prevent email spoofing and ensure delivery, the sending domain MUST have
 * correctly configured DNS records:
 * 
 * 1. SPF (Sender Policy Framework): Specifies which mail servers are authorized
 *    to send email on behalf of your domain.
 *    Example: v=spf1 include:_spf.google.com ~all
 * 
 * 2. DKIM (DomainKeys Identified Mail): Adds a digital signature to emails,
 *    allowing the receiver to verify that the email was indeed authorized by the owner
 *    of that domain and hasn't been altered in transit.
 * 
 * 3. DMARC (Domain-based Message Authentication, Reporting, and Conformance):
 *    Uses SPF and DKIM to determine the authenticity of an email message. It
 *    provides instructions to the receiving mail server on how to handle emails
 *    that fail authentication.
 *    Example: v=DMARC1; p=reject; rua=mailto:postmaster@yourdomain.com
 */

export class SafeMailer {
  private isDryRun: boolean;

  constructor(isDryRun: boolean = false) {
    this.isDryRun = isDryRun;
  }

  /**
   * Sends an email securely. If dry-run mode is enabled, it logs the email
   * instead of performing the actual delivery.
   */
  async sendEmail(options: MailOptions): Promise<{ success: boolean; message: string }> {
    const { to, from, subject, body } = options;

    if (this.isDryRun) {
      console.log('--- SAFE MAILER DRY RUN ---');
      console.log(`From: ${from}`);
      console.log(`To: ${to}`);
      console.log(`Subject: ${subject}`);
      console.log(`Body: ${body}`);
      console.log('---------------------------');
      
      return {
        success: true,
        message: '[Dry Run] Email logged successfully. No actual transmission occurred.'
      };
    }

    // Actual mailing logic: Calling the backend API endpoint
    try {
      console.log(`Initiating real transmission from ${from} to ${to} via API...`);
      
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': ((import.meta as any).env.VITE_AGENT_API_KEY as string) || ''
        },
        body: JSON.stringify({
          to,
          subject,
          body,
          fromName: 'CreditFlow'
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || result.message || 'Failed to send email');
      }

      return {
        success: true,
        message: `Email dispatched successfully! Message ID: ${result.messageId}`
      };
    } catch (error) {
      console.error('SafeMailer Error:', error);
      return {
        success: false,
        message: `Transmission failed: ${error instanceof Error ? error.message : 'Unknown network error'}. Ensure SMTP is configured in the backend.`
      };
    }
  }
}
