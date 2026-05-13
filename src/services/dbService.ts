/**
 * Service to interact with the backend database API
 */

export interface AuditLog {
  invoice_no: string;
  client_name: string;
  overdue_days: number;
  escalation_stage: number;
  tone: string;
  subject: string;
  send_status: string;
  dry_run: boolean;
  timestamp?: string;
}

export async function saveLog(log: AuditLog) {
  const response = await fetch('/api/logs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(log),
  });
  if (!response.ok) {
    throw new Error('Failed to save log');
  }
  return response.json();
}

export async function saveLogsBatch(logs: AuditLog[]) {
  const response = await fetch('/api/logs/batch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(logs),
  });
  if (!response.ok) {
    throw new Error('Failed to save batch logs');
  }
  return response.json();
}

export async function fetchLogs(): Promise<AuditLog[]> {
  const response = await fetch('/api/logs');
  if (!response.ok) {
    throw new Error('Failed to fetch logs');
  }
  return response.json();
}
