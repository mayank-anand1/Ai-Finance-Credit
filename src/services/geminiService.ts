import { GoogleGenAI, Type } from "@google/genai";
import { EscalationStage } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface EmailData {
  invoice_no: string;
  client_name: string;
  amount: string;
  due_date: string;
  overdue_days: number;
  payment_link: string;
  stage: EscalationStage;
  tone: string;
}

export interface GeneratedEmail {
  subject: string;
  body: string;
}

const SYSTEM_PROMPT = `You are a professional Senior Credit Control Officer at a reputable firm. 
Your task is to draft a collection follow-up email for an overdue invoice.

FORMATTING REQUIREMENTS:
1. Use Markdown for styling.
2. Bold key information: Invoice numbers, Due Dates, and Amounts.
3. Use a clear, structured layout. Use bullet points to summarize invoice details for readability.
4. Separate paragraphs clearly with double newlines.
5. Use a professional sign-off.
6. The body should look polished when rendered in a Markdown viewer.

CRITICAL RULES:
1. Use ONLY the data provided. Do not hallucinate figures.
2. Maintain a professional, business-centric tone.
3. ADHERE STRICTLY to the requested TONE and STAGE.
4. Include the payment link clearly as the primary Call to Action (CTA).
5. Output MUST be in JSON format with "subject" and "body" keys.

TONE GUIDELINES:
- Stage 1 (Warm): Assume it's an oversight. Be friendly and helpful.
- Stage 2 (Firm): Be polite but move to a more direct request for payment confirmation.
- Stage 3 (Serious): Mention that late payments impact business operations. Request response within 48h.
- Stage 4 (Urgent): Use stern language. Final reminder before internal escalation.`;

export async function generateFollowUpEmail(data: EmailData): Promise<GeneratedEmail> {
  const prompt = `
    Draft a follow-up email for:
    Client: ${data.client_name}
    Invoice: ${data.invoice_no}
    Amount: ${data.amount}
    Due Date: ${data.due_date}
    Overdue Days: ${data.overdue_days}
    Payment Link: ${data.payment_link}
    Escalation Stage: ${data.stage}
    Current Tone Requirement: ${data.tone}
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            subject: { type: Type.STRING },
            body: { type: Type.STRING },
          },
          required: ["subject", "body"],
        },
      },
    });

    const result = JSON.parse(response.text);
    return result as GeneratedEmail;
  } catch (error) {
    console.error("Gemini generation error:", error);
    return {
      subject: `Follow-up: Invoice ${data.invoice_no} overdue`,
      body: `Dear **${data.client_name}**,

This is a reminder regarding invoice **${data.invoice_no}** for **${data.amount}** which was due on **${data.due_date}**.

Please settle this as soon as possible via the link below:

[Pay Invoice Now](${data.payment_link})

Best regards,
**Credit Control Team**`
    };
  }
}
