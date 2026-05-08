import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'data', 'finance_audit.db');

// Ensure data directory exists (handled by create_file in parent but safely here too)
const db = new Database(DB_PATH);

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    invoice_no TEXT,
    client_name TEXT,
    overdue_days INTEGER,
    escalation_stage INTEGER,
    subject TEXT,
    send_status TEXT,
    dry_run BOOLEAN
  )
`);

export interface AuditLog {
  invoice_no: string;
  client_name: string;
  overdue_days: number;
  escalation_stage: number;
  subject: string;
  send_status: string;
  dry_run: boolean;
}

export function logAction(log: AuditLog) {
  const stmt = db.prepare(`
    INSERT INTO audit_logs (invoice_no, client_name, overdue_days, escalation_stage, subject, send_status, dry_run)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  
  stmt.run(
    log.invoice_no,
    log.client_name,
    log.overdue_days,
    log.escalation_stage,
    log.subject,
    log.send_status,
    log.dry_run ? 1 : 0
  );
}

export function getLogs() {
  const stmt = db.prepare('SELECT * FROM audit_logs ORDER BY timestamp DESC');
  return stmt.all();
}
