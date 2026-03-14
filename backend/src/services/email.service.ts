import Handlebars from 'handlebars';
import fs from 'fs';
import path from 'path';
import { sendEmail, EmailOptions, EmailResult } from '../config/email';
import { env } from '../config/env';
import { logger } from '../config/logger';

/**
 * Email Service — uses Handlebars templates for rich HTML emails.
 *
 * Template files live in `src/templates/emails/`.
 * The base layout is in `src/templates/emails/layouts/base.hbs`.
 *
 * Templates are compiled once and cached for performance.
 */

// ── Template Cache ─────────────────────────────────────────────────────

const templateCache = new Map<string, Handlebars.TemplateDelegate>();
const TEMPLATES_DIR = path.join(__dirname, '..', 'templates', 'emails');

/**
 * Load and compile a Handlebars template from the templates directory.
 * Results are cached so each `.hbs` file is only read from disk once.
 */
const compileTemplate = (templateName: string): Handlebars.TemplateDelegate => {
    if (templateCache.has(templateName)) {
        return templateCache.get(templateName)!;
    }

    const filePath = path.join(TEMPLATES_DIR, `${templateName}.hbs`);

    if (!fs.existsSync(filePath)) {
        throw new Error(`Email template not found: ${filePath}`);
    }

    const source = fs.readFileSync(filePath, 'utf-8');
    const compiled = Handlebars.compile(source);
    templateCache.set(templateName, compiled);

    return compiled;
};

/**
 * Render a named template inside the base layout.
 *
 * @param templateName  File name (without `.hbs`) in the templates directory
 * @param data          Variables passed to both the inner template and the layout
 * @returns             Complete HTML string ready to be sent as an email body
 */
const renderEmail = (templateName: string, data: Record<string, unknown>): string => {
    // Compile the inner content template
    const contentTemplate = compileTemplate(templateName);
    const bodyHtml = contentTemplate(data);

    // Compile the base layout and inject the rendered body
    const layoutTemplate = compileTemplate('layouts/base');
    return layoutTemplate({
        ...data,
        body: bodyHtml,
        year: new Date().getFullYear(),
    });
};

// ── Service Methods ────────────────────────────────────────────────────

class EmailService {
    /**
     * Send a welcome email after successful registration.
     */
    async sendWelcomeEmail(to: string, name: string): Promise<EmailResult> {
        const html = renderEmail('welcome', {
            name,
            dashboardUrl: env.frontendUrl,
        });

        return sendEmail({
            to,
            subject: '🏥 Welcome to Healthcare Appointment System',
            html,
            text: `Welcome, ${name}! Thank you for registering with our Healthcare Appointment System.`,
        });
    }

    /**
     * Send an appointment confirmation email.
     */
    async sendAppointmentConfirmation(
        to: string,
        patientName: string,
        doctorName: string,
        date: string,
        time: string,
        appointmentId: string
    ): Promise<EmailResult> {
        const html = renderEmail('appointment-confirmation', {
            patientName,
            doctorName,
            date,
            time,
            appointmentId,
            appointmentsUrl: `${env.frontendUrl}/appointments`,
        });

        return sendEmail({
            to,
            subject: `✅ Appointment Confirmed — ${date} at ${time}`,
            html,
            text: `Hi ${patientName}, your appointment with Dr. ${doctorName} on ${date} at ${time} has been confirmed. Reference: ${appointmentId}`,
        });
    }

    /**
     * Send an appointment cancellation email.
     */
    async sendAppointmentCancellation(
        to: string,
        patientName: string,
        doctorName: string,
        date: string,
        time: string,
        reason?: string
    ): Promise<EmailResult> {
        const html = renderEmail('appointment-cancellation', {
            patientName,
            doctorName,
            date,
            time,
            reason,
            bookUrl: `${env.frontendUrl}/appointments/book`,
        });

        return sendEmail({
            to,
            subject: `❌ Appointment Cancelled — ${date}`,
            html,
            text: `Hi ${patientName}, your appointment with Dr. ${doctorName} on ${date} at ${time} has been cancelled.${reason ? ` Reason: ${reason}` : ''}`,
        });
    }

    /**
     * Send an appointment reminder email.
     */
    async sendAppointmentReminder(
        to: string,
        patientName: string,
        doctorName: string,
        date: string,
        time: string
    ): Promise<EmailResult> {
        const html = renderEmail('appointment-reminder', {
            patientName,
            doctorName,
            date,
            time,
            appointmentsUrl: `${env.frontendUrl}/appointments`,
        });

        return sendEmail({
            to,
            subject: `🔔 Appointment Reminder — ${date} at ${time}`,
            html,
            text: `Hi ${patientName}, reminder: You have an appointment with Dr. ${doctorName} on ${date} at ${time}.`,
        });
    }

    /**
     * Send a password reset email.
     */
    async sendPasswordResetEmail(
        to: string,
        name: string,
        resetToken: string
    ): Promise<EmailResult> {
        const resetUrl = `${env.frontendUrl}/reset-password?token=${resetToken}`;

        const html = renderEmail('password-reset', {
            name,
            resetUrl,
        });

        return sendEmail({
            to,
            subject: '🔑 Password Reset — Healthcare System',
            html,
            text: `Hi ${name}, reset your password using this link: ${resetUrl}. This link expires in 1 hour.`,
        });
    }

    /**
     * Render any template by name with custom data and send it.
     * Useful for ad-hoc or future templates without adding a new method.
     */
    async sendTemplated(
        templateName: string,
        data: Record<string, unknown>,
        options: Omit<EmailOptions, 'html'>
    ): Promise<EmailResult> {
        const html = renderEmail(templateName, data);
        return sendEmail({ ...options, html });
    }

    /**
     * Send a generic email (no template, raw options).
     */
    async send(options: EmailOptions): Promise<EmailResult> {
        return sendEmail(options);
    }

    /**
     * Pre-warm the template cache by loading all templates.
     * Call this during server startup if desired.
     */
    preloadTemplates(): void {
        const templates = [
            'layouts/base',
            'welcome',
            'appointment-confirmation',
            'appointment-cancellation',
            'appointment-reminder',
            'password-reset',
        ];

        for (const name of templates) {
            try {
                compileTemplate(name);
                logger.info(`📧 Preloaded email template: ${name}`);
            } catch (error) {
                logger.warn(`📧 Could not preload template "${name}": ${error}`);
            }
        }
    }
}

export const emailService = new EmailService();
