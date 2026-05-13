/**
 * Escalation Logic for Credit Follow-Up (Frontend version)
 */

import { EscalationInfo, EscalationStage } from '../types';

export function calculateEscalation(dueDateStr: string): EscalationInfo {
  const dueDate = new Date(dueDateStr);
  const today = new Date();
  
  const diffTime = today.getTime() - dueDate.getTime();
  const overdueDays = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));

  if (overdueDays === 0) {
    return {
      stage: 0 as any,
      tone: "Pending",
      description: "Invoice not yet due.",
      overdueDays: 0
    };
  }

  if (overdueDays >= 1 && overdueDays <= 7) {
    return { stage: EscalationStage.STAGE_1, tone: "Warm & Friendly", description: "Gentle reminder.", overdueDays };
  } else if (overdueDays >= 8 && overdueDays <= 14) {
    return { stage: EscalationStage.STAGE_2, tone: "Polite but Firm", description: "Requesting confirmation.", overdueDays };
  } else if (overdueDays >= 15 && overdueDays <= 21) {
    return { stage: EscalationStage.STAGE_3, tone: "Formal & Serious", description: "Mentioning impact.", overdueDays };
  } else if (overdueDays >= 22 && overdueDays <= 30) {
    return { stage: EscalationStage.STAGE_4, tone: "Stern & Urgent", description: "Final reminder.", overdueDays };
  } else {
    return { stage: EscalationStage.ESCALATED, tone: "Escalated", description: "Manual review required.", overdueDays };
  }
}
