import nodemailer, { Transporter } from 'nodemailer';
import { env, EnvConfig, isProduction } from './env';
import { logger } from './logger';

const envCfg: EnvConfig = env;
const isProd: () => boolean = isProduction;

/**
 * Email configuration and transporter setup using Nodemailer.
 *
 * In development mode with no SMTP credentials configured, a test account
 * is automatically created using Ethereal Email (https://ethereal.email)
 * so you can preview sent emails without a real mail server.
 *
 * In production, provide real SMTP credentials via environment variables:
 *   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD
 */

interface EmailOptions {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  from?: string;
  replyTo?: string;
  attachments?: Array<{
    filename: string;
    content?: string | Buffer;
    path?: string;
    contentType?: string;
  }>;
}

interface EmailResult {
  success: boolean;
  messageId?: string;
  previewUrl?: string | false;
  error?: string;
}

let transporter: Transporter | null = null;

/**
 * Creates and returns the Nodemailer transporter.
 * Uses Ethereal for development if no SMTP credentials are set.
 */
export const initializeEmailTransporter = async (): Promise<Transporter | null> => {
  if (transporter) return transporter;

  const hasSmtpConfig = envCfg.smtpHost && envCfg.smtpUser && envCfg.smtpPassword;

  if (hasSmtpConfig) {
    // Production / configured SMTP
    transporter = nodemailer.createTransport({
      host: envCfg.smtpHost,
      port: envCfg.smtpPort,
      secure: envCfg.smtpPort === 465,
      auth: {
        user: envCfg.smtpUser,
        pass: envCfg.smtpPassword,
      },
      pool: true,
      maxConnections: 5,
      maxMessages: 100,
      rateLimit: 10, // max 10 messages/second
    });

    logger.info(`📧 Email transporter configured with SMTP host: ${envCfg.smtpHost}`);
  } else if (!isProd()) {
    // Development fallback — Ethereal test account
    const testAccount = await nodemailer.createTestAccount();

    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });

    logger.info('📧 Email transporter configured with Ethereal test account');
    logger.info(`   Ethereal user: ${testAccount.user}`);
    logger.info('   Preview sent emails at https://ethereal.email');
  } else {
    logger.warn('⚠️  No SMTP configuration found. Email sending is disabled.');
    return null;
  }

  // Verify transporter connection
  try {
    await transporter?.verify();
    logger.info('📧 Email transporter connection verified successfully');
  } catch (error) {
    logger.error('📧 Email transporter verification failed:', error);
  }

  return transporter;
};

/**
 * Send an email using the configured transporter.
 */
export const sendEmail = async (options: EmailOptions): Promise<EmailResult> => {
  try {
    if (!transporter) {
      await initializeEmailTransporter();
    }

    if (!transporter) {
      logger.warn('Email not sent — transporter not available');
      return { success: false, error: 'Email transporter not configured' };
    }

    const mailOptions = {
      from:
        options.from || `"Healthcare System" <${envCfg.smtpUser || 'noreply@healthcare.local'}>`,
      to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
      replyTo: options.replyTo,
      attachments: options.attachments,
    };

    const rawInfo: unknown = await transporter.sendMail(mailOptions);
    const info = rawInfo as { messageId: string };
    const previewUrl = nodemailer.getTestMessageUrl(
      rawInfo as Parameters<typeof nodemailer.getTestMessageUrl>[0]
    );

    logger.info(`📧 Email sent successfully [${info.messageId}] to: ${mailOptions.to}`);
    if (previewUrl) {
      logger.info(`   Preview URL: ${previewUrl}`);
    }

    return {
      success: true,
      messageId: info.messageId,
      previewUrl,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown email error';
    logger.error(`📧 Failed to send email: ${errorMessage}`);
    return { success: false, error: errorMessage };
  }
};

/**
 * Get the raw Nodemailer transporter (for advanced use cases).
 */
export const getTransporter = (): Transporter | null => transporter;

export type { EmailOptions, EmailResult };
