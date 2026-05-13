import { Request, Response, NextFunction } from 'express';
import { rateLimit } from 'express-rate-limit';

/**
 * Unauthorised Access Mitigation: 
 * Implement a middleware that authenticates requests to an agent endpoint 
 * using API keys or OAuth, including a mechanism for rate limiting.
 */

/**
 * Basic API Key authentication middleware.
 * In a real-world scenario, this would check against a secure database or 
 * validate an OAuth token.
 */
export function authenticateRequest(req: Request, res: Response, next: NextFunction) {
  const apiKey = req.headers['x-api-key'];
  
  // Demonstrating API Key integration from environment variables
  // This addresses API Key Exposure risk by keeping keys out of source code.
  const AUTHORIZED_KEY = process.env.AGENT_API_KEY;

  if (!apiKey || apiKey !== AUTHORIZED_KEY) {
    return res.status(401).json({
      error: 'Unauthorised: A valid API key is required to access the AI Agent endpoint.'
    });
  }

  next();
}

/**
 * Rate limiting middleware to prevent brute force and DOS attacks.
 * Addresses Unauthorised Access by limiting how many attempts or requests 
 * can be made in a specific timeframe.
 */
export const agentRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again after 15 minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});
