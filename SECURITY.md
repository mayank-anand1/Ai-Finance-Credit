# Security Documentation - CreditQuest

## Security Practices & Graded Requirements

### 1. Secret Management
- **Environment Variables**: All sensitive keys (e.g., `GEMINI_API_KEY`) are managed via `.env` files.
- **No Hardcoding**: Credentials and secrets are never hardcoded in the source code.

### 2. Prompt Injection Mitigation
- **Structured System Prompts**: Using role-based prompting and schema-enforced outputs to prevent the model from deviating or escaping the finance context.
- **Input Sanitization**: User-provided data (client names, amounts) is treated as strings and escaped in prompts.

### 3. Data Privacy & Masking
- **Audit Logs**: Logs store professional transaction data. PII (Personally Identifiable Information) like full personal addresses is avoided where possible.
- **Local Persistence**: Data is stored in a local SQLite database, not shared with external 3rd party databases.

### 4. Hallucination Risk Reduction
- **Data Anchoring**: The AI is strictly instructed to use the provided invoice data (amount, number, link) and is forbidden from making up generic financial figures.
- **Tone Guardrails**: Specific instructions for each escalation stage ensure the AI doesn't become inappropriately aggressive or overly lenient.

### 5. Email Spoofing & Unauthorized Access
- **Dry Run Mode**: Default "Dry Run" mode ensures no actual emails are sent until the system is fully verified.
- **Input Validation**: CSV parser validates required columns and data types before processing.

### 6. Rate Limiting
- **Client-side Throttling**: The generation loop includes natural delays and batch processing to avoid API rate limit hits.

## Deployment Security
- The application runs behind a reverse proxy.
- Backend API routes are isolated from the frontend delivery.
