import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import nodemailer from "nodemailer";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import { z } from "zod";
import { logAction, getLogs } from "./utils/logger.ts";

import { authenticateRequest, agentRateLimiter } from "./src/middleware/auth.ts";
import { maskPII, sanitizeInput } from "./src/utils/security.ts";

// Use process.cwd() for path resolution in production to avoid ESM/CJS compatibility issues
const DATA_DIR = path.join(process.cwd(), "data");

/**
 * Lazy initialization of the mail transporter to handle missing environment variables gracefully.
 */
let transporter: nodemailer.Transporter | null = null;
let currentConfig: string | null = null;

function getTransporter() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  const configKey = `${SMTP_HOST}:${SMTP_PORT}:${SMTP_USER}:${SMTP_PASS}`;

  if (transporter && currentConfig === configKey) {
    return transporter;
  }
  
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
    console.warn("SMTP configuration is incomplete. Email sending will be disabled.");
    transporter = null;
    currentConfig = null;
    return null;
  }

  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: parseInt(SMTP_PORT, 10),
    secure: SMTP_PORT === "465",
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });
  
  currentConfig = configKey;
  return transporter;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Trust proxy for accurate client IP detection (required for rate limiting behind Cloud Run proxy)
  app.set('trust proxy', 1);

  console.log("Starting server initialization...");

  // Security Headers: XSS Protection, Clickjacking Protection, HSTS, etc.
  app.use(helmet({
    contentSecurityPolicy: false, // Disabled for development/vite compatibility if needed, but recommended for prod
  }));

  app.use(express.json());

  // Global Rate Limiter: Prevent DOS and automated scraping
  const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per window
    message: { error: "Too many requests from this IP, please try again after 15 minutes" },
    standardHeaders: true,
    legacyHeaders: false,
  });

  // Apply to all API routes
  app.use("/api/", globalLimiter);

  // Authentication Schemes
  const LoginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8),
  });

  const EmailSchema = z.object({
    to: z.string().email(),
    subject: z.string().min(1).max(200),
    body: z.string().min(1),
    fromName: z.string().optional()
  });

  const LogSchema = z.object({
    invoice_no: z.string().max(50),
    client_name: z.string().max(100),
    overdue_days: z.number().int(),
    escalation_stage: z.number().int(),
    tone: z.string().max(50),
    subject: z.string().max(500),
    send_status: z.string().max(50),
    dry_run: z.boolean(),
    error_reason: z.string().optional()
  });

  const BatchLogSchema = z.array(LogSchema);

  // Login Endpoint: Moved from client-side hardcoding to server-side check
  app.post("/api/auth/login", (req, res) => {
    try {
      const { email, password } = LoginSchema.parse(req.body);
      
      const adminEmail = process.env.ADMIN_EMAIL || "mayankanand1006@gmail.com";
      const adminPass = process.env.ADMIN_PASSWORD || "Mayanka@12";

      if (email === adminEmail && password === adminPass) {
        // In a production app, we would issue a JWT here.
        // For this demo, we return success.
        res.json({ 
          success: true, 
          user: { 
            email, 
            role: "administrator" 
          } 
        });
        
        logAction({
          invoice_no: "N/A",
          client_name: "SYSTEM",
          overdue_days: 0,
          escalation_stage: 0,
          tone: "N/A",
          subject: "User login successful",
          send_status: "SUCCESS",
          dry_run: true
        });
      } else {
        res.status(401).json({ error: "Invalid credentials" });
        
        logAction({
          invoice_no: "N/A",
          client_name: "SYSTEM",
          overdue_days: 0,
          escalation_stage: 0,
          tone: "N/A",
          subject: `Failed login attempt for ${email}`,
          send_status: "FAILURE",
          dry_run: true
        });
      }
    } catch (error) {
      res.status(400).json({ error: "Invalid login data" });
    }
  });

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.get("/api/mailer-status", async (req, res) => {
    const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
    const isConfigured = !!(SMTP_HOST && SMTP_PORT && SMTP_USER && SMTP_PASS);
    
    let verificationStatus: { success: boolean; error?: string } = { success: false };
    
    if (isConfigured) {
      const mailTransporter = getTransporter();
      if (mailTransporter) {
        try {
          await mailTransporter.verify();
          verificationStatus = { success: true };
        } catch (error) {
          console.error("SMTP verification failed:", error);
          verificationStatus = { 
            success: false, 
            error: error instanceof Error ? error.message : String(error) 
          };
        }
      }
    }

    res.json({
      configured: isConfigured,
      verified: verificationStatus.success,
      auth_error: verificationStatus.error,
      details: isConfigured ? {
        host: SMTP_HOST,
        port: SMTP_PORT,
        user: SMTP_USER?.substring(0, 3) + "****"
      } : null
    });
  });

  /**
   * Real Email Dispatch Endpoint
   * Use Nodemailer to send emails via SMTP.
   */
  app.post("/api/send-email", authenticateRequest, async (req, res) => {
    try {
      const { to, subject, body, fromName } = EmailSchema.parse(req.body);

      const mailTransporter = getTransporter();
      if (!mailTransporter) {
        return res.status(503).json({ 
          error: "Email service is not configured. Please check SMTP environment variables." 
        });
      }

      const info = await mailTransporter.sendMail({
        from: `"${fromName || process.env.SMTP_FROM_NAME || 'CreditFlow'}" <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER}>`,
        to,
        subject,
        text: body,
        html: body.replace(/\n/g, '<br>'), // Simple plain text to HTML conversion
      });

      console.log("Email sent: %s", info.messageId);
      res.json({ success: true, messageId: info.messageId });
    } catch (error) {
      console.error("Email send error:", error);
      res.status(500).json({ 
        success: false, 
        message: error instanceof Error ? error.message : "Failed to dispatch email." 
      });
    }
  });

  /**
   * Unauthorised Access Mitigation: 
   * Secured endpoint using authentication middleware and rate limiting.
   */
  app.post("/api/agent/analyze", agentRateLimiter, authenticateRequest, (req, res) => {
    try {
      const { emailContent } = req.body;
      
      // Prompt Injection Mitigation: Sanitize input
      const sanitizedContent = sanitizeInput(emailContent);
      
      // Data Privacy / PII Mitigation: Mask sensitive data before internal processing
      const maskedContent = maskPII(sanitizedContent);
      
      console.log(`Analyzing (masked) content: ${maskedContent}`);

      // Simulated Hallucination Risk Mitigation: 
      // In a real app, this would be an LLM call validated against zod.
      // For this demo, we return a mock validated response.
      res.json({
        success: true,
        analysis: {
          original_length: emailContent.length,
          processed_content: maskedContent,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      res.status(500).json({ error: "Analysis failed" });
    }
  });

  app.get("/api/logs", (req, res) => {
    try {
      const logs = getLogs();
      res.json(logs);
    } catch (error) {
      console.error("Fetch logs error:", error);
      res.status(500).json({ error: "Failed to fetch logs" });
    }
  });

  app.post("/api/logs", (req, res) => {
    try {
      const logData = LogSchema.parse(req.body);
      logAction(logData);
      res.json({ success: true });
    } catch (error) {
      console.error("Log action error:", error);
      res.status(400).json({ error: "Invalid log data" });
    }
  });

  app.post("/api/logs/batch", (req, res) => {
    try {
      const logs = BatchLogSchema.parse(req.body);
      logs.forEach(log => logAction(log));
      res.json({ success: true, count: logs.length });
    } catch (error) {
      console.error("Batch log error:", error);
      res.status(400).json({ error: "Invalid batch log data" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    console.log("Running in DEVELOPMENT mode with Vite middleware");
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        host: '0.0.0.0',
        port: 3000
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Running in PRODUCTION mode");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`>>> Server is actively listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error("Failed to start server:", err);
});
