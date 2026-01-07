import sgMail from '@sendgrid/mail';

const getFrontendUrl = () => {
  const isProduction = process.env.ENVIRONMENT === 'prod';
  return isProduction
    ? process.env.FRONTEND_URL_PROD
    : process.env.FRONTEND_URL;
};

export const sendInvitationEmail = async (email, invitationToken) => {
  const frontendUrl = getFrontendUrl();
  const invitationLink = `${frontendUrl}/accept-invitation?token=${invitationToken}`;

  if (!process.env.SENDGRID_API_KEY || !process.env.SENDGRID_FROM_EMAIL) {
    return {
      success: false,
      error: 'SendGrid not configured',
      link: invitationLink
    };
  }

  try {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);

    const msg = {
      to: email,
      from: process.env.SENDGRID_FROM_EMAIL,
      subject: 'You have been invited to join Issue Tracker',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
            <h2 style="color: #333; margin-top: 0;">You've been invited!</h2>
            <p>You have been invited to join the Issue Tracker application.</p>
            <p>Click the button below to accept your invitation and set up your account:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${invitationLink}" style="display: inline-block; padding: 14px 28px; background-color: #007bff; color: #ffffff !important; text-decoration: none; border-radius: 4px; font-weight: bold; font-size: 16px;">Accept Invitation</a>
            </div>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #007bff; background-color: #f8f9fa; padding: 10px; border-radius: 4px;">${invitationLink}</p>
            <p><strong>This invitation will expire in 7 days.</strong></p>
            <div style="margin-top: 30px; font-size: 12px; color: #666;">
              <p>If you didn't request this invitation, you can safely ignore this email.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        You've been invited!
        
        You have been invited to join the Issue Tracker application.
        
        Click the link below to accept your invitation and set up your account:
        ${invitationLink}
        
        This invitation will expire in 7 days.
        
        If you didn't request this invitation, you can safely ignore this email.
      `,
    };

    const sendPromise = sgMail.send(msg);
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Email sending timeout after 15 seconds')), 15000);
    });

    const [response] = await Promise.race([sendPromise, timeoutPromise]);

    if (response && response.statusCode >= 200 && response.statusCode < 300) {
      return {
        success: true,
        messageId: response.headers?.['x-message-id'] || 'sent'
      };
    } else {
      return {
        success: false,
        error: `SendGrid returned status ${response?.statusCode}`,
        link: invitationLink
      };
    }
  } catch (error) {
    const errorMessage = error.response?.body?.errors?.[0]?.message || error.message || 'Email sending failed';
    return {
      success: false,
      error: errorMessage,
      link: invitationLink
    };
  }
};

export const sendPasswordResetEmail = async (email, resetToken) => {
  const frontendUrl = getFrontendUrl();
  const resetLink = `${frontendUrl}/reset-password?token=${resetToken}`;

  if (!process.env.SENDGRID_API_KEY || !process.env.SENDGRID_FROM_EMAIL) {
    return {
      success: false,
      error: 'SendGrid not configured',
      link: resetLink
    };
  }

  try {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);

    const msg = {
      to: email,
      from: process.env.SENDGRID_FROM_EMAIL,
      subject: 'Reset Your Password - Issue Tracker',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
            <h2 style="color: #333; margin-top: 0;">Password Reset Request</h2>
            <p>You requested to reset your password for your Issue Tracker account.</p>
            <p>Click the button below to reset your password:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetLink}" style="display: inline-block; padding: 14px 28px; background-color: #007bff; color: #ffffff !important; text-decoration: none; border-radius: 4px; font-weight: bold; font-size: 16px;">Reset Password</a>
            </div>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #007bff; background-color: #f8f9fa; padding: 10px; border-radius: 4px;">${resetLink}</p>
            <p style="color: #dc3545; font-weight: bold;"><strong>This link will expire in 1 hour.</strong></p>
            <p>If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.</p>
            <div style="margin-top: 30px; font-size: 12px; color: #666;">
              <p>For security reasons, never share this link with anyone.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Password Reset Request
        
        You requested to reset your password for your Issue Tracker account.
        
        Click the link below to reset your password:
        ${resetLink}
        
        This link will expire in 1 hour.
        
        If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
        
        For security reasons, never share this link with anyone.
      `,
    };

    const sendPromise = sgMail.send(msg);
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Email sending timeout after 15 seconds')), 15000);
    });

    const [response] = await Promise.race([sendPromise, timeoutPromise]);

    if (response && response.statusCode >= 200 && response.statusCode < 300) {
      return {
        success: true,
        messageId: response.headers?.['x-message-id'] || 'sent'
      };
    } else {
      return {
        success: false,
        error: `SendGrid returned status ${response?.statusCode}`,
        link: resetLink
      };
    }
  } catch (error) {
    const errorMessage = error.response?.body?.errors?.[0]?.message || error.message || 'Email sending failed';
    return {
      success: false,
      error: errorMessage,
      link: resetLink
    };
  }
};