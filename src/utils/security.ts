import { z } from 'zod';

/**
 * Prompt Injection Mitigation: 
 * Implement input sanitization and structured output schemas to ensure 
 * user input cannot manipulate the agent's core instructions.
 */

/**
 * Sanitizes user input to prevent basic prompt injection attacks 
 * by removing known command-like sequences and excessive whitespace.
 */
export function sanitizeInput(input: string): string {
  if (!input) return '';
  // Remove potential instruction-overriding markers and common injection keywords
  const sanitized = input
    .replace(/\[\s*system\s*\]/gi, '')
    .replace(/\[\s*assistant\s*\]/gi, '')
    .replace(/\[\s*user\s*\]/gi, '')
    .replace(/IGNORE ALL PREVIOUS INSTRUCTIONS/gi, '[REDACTED]')
    .replace(/YOU ARE NOW/gi, '[REDACTED]')
    .replace(/forget (your|the) instructions/gi, '[REDACTED]')
    .replace(/reveal (your|the) (prompt|instruction)/gi, '[REDACTED]')
    .replace(/<script.*?>.*?<\/script>/gi, '') // Basic XSS mitigation
    .trim();
  
  return sanitized;
}

/**
 * Hallucination Risk Mitigation: 
 * Define a structured data schema for an 'Email Analysis' output.
 * Including specific fields ensures the model output is strictly validated 
 * before being used by the application.
 */
export const EmailAnalysisSchema = z.object({
  score: z.number().min(0).max(1).describe("A float score between 0 and 1 representing the fraud probability."),
  is_fraud: z.boolean().describe("A boolean flag indicating if the email is considered fraudulent."),
  reasoning: z.string().min(1).describe("Detailed reasoning explaining the analysis result to ensure transparency.")
});

export type EmailAnalysis = z.infer<typeof EmailAnalysisSchema>;

/**
 * Data Privacy / PII Mitigation: 
 * Create a utility for 'local processing' that performs data masking 
 * on strings so that no plaintext PII is sent to cloud LLM endpoints.
 */

/**
 * Masks common PII patterns (emails, phone numbers, SSNs, credit cards) before sending to external APIs.
 */
export function maskPII(text: string): string {
  let masked = text;
  
  // Mask emails: example@email.com -> e*****@email.com
  const emailRegex = /([a-zA-Z0-9._%+-])[a-zA-Z0-9._%+-]+@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
  masked = masked.replace(emailRegex, '$1*****@$2');
  
  // Mask phone numbers: +1 123-456-7890 -> +1 ***-***-7890
  const phoneRegex = /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
  masked = masked.replace(phoneRegex, (match) => {
    return match.replace(/\d/g, (d, offset) => (offset < match.length - 4 ? '*' : d));
  });

  // Mask Credit Cards (Luhn-like patterns)
  const ccRegex = /\b(?:\d[ -]*?){13,16}\b/g;
  masked = masked.replace(ccRegex, "****-****-****-****");

  // Mask Date of Birth / SSN patterns (simplified)
  const ssnRegex = /\b\d{3}-\d{2}-\d{4}\b/g;
  masked = masked.replace(ssnRegex, "***-**-****");

  return masked;
}
