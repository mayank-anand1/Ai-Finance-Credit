/**
 * Escalation Logic for Credit Follow-Up
 */

export enum EscalationStage {
  STAGE_1 = 1,
  STAGE_2 = 2,
  STAGE_3 = 3,
  STAGE_4 = 4,
  ESCALATED = 5, // No email sent
}

export interface EscalationInfo {
  stage: EscalationStage;
  tone: string;
  description: string;
  overdueDays: number;
}

export function calculateEscalation(dueDateStr: string): EscalationInfo {
  const dueDate = new Date(dueDateStr);
  const today = new Date();
  
  // Calculate difference in days
  const diffTime = today.getTime() - dueDate.getTime();
  const overdueDays = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));

  if (overdueDays === 0) {
    return {
      stage: 0 as any,
      tone: "None",
      description: "Not overdue",
      overdueDays: 0
    };
  }

  if (overdueDays >= 1 && overdueDays <= 7) {
    return {
      stage: EscalationStage.STAGE_1,
      tone: "Warm & Friendly",
      description: "Gentle reminder, assuming oversight.",
      overdueDays
    };
  } else if (overdueDays >= 8 && overdueDays <= 14) {
    return {
      stage: EscalationStage.STAGE_2,
      tone: "Polite but Firm",
      description: "Requesting confirmation of payment.",
      overdueDays
    };
  } else if (overdueDays >= 15 && overdueDays <= 21) {
    return {
      stage: EscalationStage.STAGE_3,
      tone: "Formal & Serious",
      description: "Mentioning impact & 48h response requested.",
      overdueDays
    };
  } else if (overdueDays >= 22 && overdueDays <= 30) {
    return {
      stage: EscalationStage.STAGE_4,
      tone: "Stern & Urgent",
      description: "Final reminder, mentioning escalation risk.",
      overdueDays
    };
  } else {
    return {
      stage: EscalationStage.ESCALATED,
      tone: "N/A",
      description: "Flagged for manual escalation. No automatic email sent.",
      overdueDays
    };
  }
}
