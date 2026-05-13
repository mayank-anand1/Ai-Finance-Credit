import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'finance_audit.db');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

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
    tone TEXT,
    subject TEXT,
    send_status TEXT,
    dry_run BOOLEAN
  )
`);

// Simple column migration if it doesn't exist
try {
  db.exec("ALTER TABLE audit_logs ADD COLUMN tone TEXT");
} catch (e) {
  // Column likely already exists
}

export interface AuditLog {
  invoice_no: string;
  client_name: string;
  overdue_days: number;
  escalation_stage: number;
  tone: string;
  subject: string;
  send_status: string;
  dry_run: boolean;
}

export function logAction(log: AuditLog) {
  const stmt = db.prepare(`
    INSERT INTO audit_logs (invoice_no, client_name, overdue_days, escalation_stage, tone, subject, send_status, dry_run)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  stmt.run(
    log.invoice_no,
    log.client_name,
    log.overdue_days,
    log.escalation_stage,
    log.tone,
    log.subject,
    log.send_status,
    log.dry_run ? 1 : 0
  );
}

export function getLogs() {
  const stmt = db.prepare('SELECT * FROM audit_logs ORDER BY timestamp DESC');
  return stmt.all();
}
