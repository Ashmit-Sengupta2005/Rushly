import { BrevoClient } from '@getbrevo/brevo';
import { env } from '../config/.env.js';
import { logger } from './logger.js';

// Single Brevo API client, initialized once at boot.
const brevo = new BrevoClient({ apiKey: env.BREVO_API_KEY });

// ============================================================
// Public interface — same shape as before.
// ============================================================
export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export const emailService={
    async send(payload:EmailPayload):Promise<{id:String}>{
        try{
            // v6 SDK: sendTransacEmail takes a plain request object (no SendSmtpEmail class),
            // and resolves directly to the response body — no `.body` wrapper.
            const result = await brevo.transactionalEmails.sendTransacEmail({
                sender: {
                    name: env.EMAIL_FROM_NAME,
                    email: env.EMAIL_FROM,
                },
                to: [{ email: payload.to }],
                subject: payload.subject,
                htmlContent: payload.html,
                ...(payload.text ? { textContent: payload.text } : {}),
            });
            const messageId = result.messageId ?? 'unknown';
            logger.info(
                { to: payload.to, subject: payload.subject, messageId },
                '📧 Email sent',
            );

            return { id: messageId };
        }
        catch(err){
            // Brevo throws on failure. The error object contains the API response.
            logger.error({ err, to: payload.to, subject: payload.subject },'Email send failed',);
            throw err;  // outbox worker's retry logic handles it
            }}}