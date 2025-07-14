// ============================================================================
// FILE: lib/email-service.ts
// Email service for contact form and notifications
// ============================================================================

interface ContactEmailData {
  userEmail: string;
  userName?: string | null;
  selectedTopics: string[];
  message: string;
  isAuthenticated: boolean;
}

const TOPIC_LABELS = {
  'membership': 'Membership Plans',
  'optimization': 'Portfolio Optimization', 
  'risk': 'Portfolio Risk',
  'retirement': 'Retirement',
  'monte-carlo': 'Monte Carlo Simulations',
  'other': 'Something Else'
};

export class EmailService {
  private static contactEmail = process.env.CONTACT_EMAIL || 'quantwell7@gmail.com';

  /**
   * Send contact form email
   * Currently logs the email content - replace with actual email service
   */
  static async sendContactEmail(data: ContactEmailData): Promise<boolean> {
    try {
      // Format selected topics
      const topicsText = data.selectedTopics
        .map(topicId => TOPIC_LABELS[topicId as keyof typeof TOPIC_LABELS] || topicId)
        .join(', ');

      // Create email content
      const emailSubject = `QuantWell Contact Form: ${topicsText}`;
      const emailBody = this.formatContactEmailBody(data, topicsText);

      // For development/testing - log the email that would be sent
      console.log('📧 Contact Email Details:');
      console.log('To:', this.contactEmail);
      console.log('Subject:', emailSubject);
      console.log('Body:');
      console.log(emailBody);
      console.log('---');

      // TODO: Replace with actual email service implementation
      // Options include:
      // 1. Nodemailer with SMTP (Gmail, Outlook, etc.)
      // 2. SendGrid API
      // 3. Resend API  
      // 4. AWS SES
      // 5. Postmark API

      // For now, simulate successful email sending
      await this.simulateEmailSending();
      
      // Log for analytics/monitoring
      this.logContactSubmission(data, topicsText);

      return true;
    } catch (error) {
      console.error('Email service error:', error);
      return false;
    }
  }

  /**
   * Format the email body for contact form submissions
   */
  private static formatContactEmailBody(data: ContactEmailData, topicsText: string): string {
    return `
Contact Form Submission - QuantWell

FROM: ${data.userName || 'Guest User'}
EMAIL: ${data.userEmail}
ACCOUNT: ${data.isAuthenticated ? 'Registered User' : 'Guest User'}
TOPICS: ${topicsText}

MESSAGE:
${data.message}

---
SUBMISSION DETAILS:
- Timestamp: ${new Date().toISOString()}
- User Agent: Contact Form
- Platform: QuantWell Finance App

RESPONSE INSTRUCTIONS:
Please respond directly to: ${data.userEmail}
${data.isAuthenticated ? 
  '(This user has an account - check user profile for additional context)' : 
  '(Guest user - consider encouraging account creation in response)'
}
    `.trim();
  }

  /**
   * Simulate email sending (remove when implementing real email service)
   */
  private static async simulateEmailSending(): Promise<void> {
    return new Promise((resolve) => {
      // Simulate network delay
      setTimeout(resolve, Math.random() * 1000 + 500);
    });
  }

  /**
   * Log contact submission for analytics
   */
  private static logContactSubmission(data: ContactEmailData, topicsText: string): void {
    console.log('📊 Contact Form Analytics:', {
      userEmail: data.userEmail,
      topics: data.selectedTopics,
      topicsFormatted: topicsText,
      messageLength: data.message.length,
      isAuthenticated: data.isAuthenticated,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Validate email address format
   */
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Get contact email configuration
   */
  static getContactConfig() {
    return {
      contactEmail: this.contactEmail,
      supportedTopics: Object.entries(TOPIC_LABELS).map(([id, label]) => ({
        id,
        label
      })),
      maxMessageLength: 1000
    };
  }
}

// Future email service implementations can be added here:

/*
// Example Nodemailer implementation:
import nodemailer from 'nodemailer';

export class NodemailerEmailService extends EmailService {
  private static transporter = nodemailer.createTransporter({
    service: 'gmail',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD
    }
  });

  static async sendContactEmail(data: ContactEmailData): Promise<boolean> {
    try {
      const mailOptions = {
        from: process.env.SMTP_USER,
        to: this.contactEmail,
        subject: `QuantWell Contact: ${topicsText}`,
        text: this.formatContactEmailBody(data, topicsText),
        replyTo: data.userEmail
      };

      await this.transporter.sendMail(mailOptions);
      return true;
    } catch (error) {
      console.error('Nodemailer error:', error);
      return false;
    }
  }
}
*/

/*
// Example SendGrid implementation:
import sgMail from '@sendgrid/mail';

export class SendGridEmailService extends EmailService {
  static {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY!);
  }

  static async sendContactEmail(data: ContactEmailData): Promise<boolean> {
    try {
      const msg = {
        to: this.contactEmail,
        from: process.env.SENDGRID_FROM_EMAIL!,
        subject: `QuantWell Contact: ${topicsText}`,
        text: this.formatContactEmailBody(data, topicsText),
        replyTo: data.userEmail
      };

      await sgMail.send(msg);
      return true;
    } catch (error) {
      console.error('SendGrid error:', error);
      return false;
    }
  }
}
*/