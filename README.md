# CreditQuest: AI Finance Credit Follow-Up Agent

A professional AI agent built for finance teams to automate the process of following up on overdue invoices with appropriate escalation tones.

## Business Problem
Manual follow-up for overdue accounts is time-consuming and inconsistent. Credit managers often struggle to maintain the right balance of professionalism and firmness as invoices age.

## Features
- **Smart Ingestion**: Upload CSV/Excel invoices for automatic processing.
- **Escalation Engine**: Automatically calculates overdue days and assigns 1 of 5 escalation stages.
- **Gemini AI Integration**: Generates highly personalized, professional emails tailored to the specific escalation stage.
- **Dynamic Tone Control**: Varies from "Warm & Friendly" to "Stern & Urgent".
- **Audit Trail**: Maintains a complete SQLite log of all generated emails for compliance.
- **Dry Run Mode**: Safely test your automation without sending real emails.
- **Professional Dashboard**: Modern UI with high-level metrics and detailed logs.

## Tech Stack
- **Frontend**: React 18, Tailwind CSS, Framer Motion, Lucide Icons.
- **Backend**: Node.js, Express.
- **AI**: Google Gemini API (@google/genai).
- **Storage**: SQLite (Better-SQLite3).
- **Processing**: XLSX, Papaparse.

## Setup Instructions
1. **Environment Variables**:
   Copy `.env.example` to `.env` and add your `GEMINI_API_KEY`.
2. **Install Dependencies**:
   ```bash
   npm install
   ```
3. **Run Application**:
   ```bash
   npm run dev
   ```
4. **Access Dashboard**:
   Open `http://localhost:3000`.

## Workflow
1. **Upload**: Drag your invoice CSV into the dashboard.
2. **Review**: Check the "Invoices" tab to see overdue calculations.
3. **Generate**: Click "Generate Follow-Ups" to see AI in action.
4. **Audit**: Review the "Audit Logs" to track all system actions.

## Security Mitigations
Refer to `SECURITY.md` for full details on Prompt Injection mitigation, Data Privacy, and API security.
