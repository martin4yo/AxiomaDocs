import nodemailer from 'nodemailer';
import * as dotenv from 'dotenv';

dotenv.config();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export interface EmailTemplate {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export class EmailService {
  static async sendEmail(template: EmailTemplate): Promise<boolean> {
    try {
      const mailOptions = {
        from: `"AxiomaDocs" <${process.env.SMTP_USER}>`,
        to: template.to,
        subject: template.subject,
        html: template.html,
        text: template.text,
      };

      const info = await transporter.sendMail(mailOptions);
      console.log('Email enviado:', info.messageId);
      return true;
    } catch (error) {
      console.error('Error enviando email:', error);
      return false;
    }
  }

  static generatePasswordResetEmail(userEmail: string, userName: string, resetToken: string): EmailTemplate {
    const resetUrl = `${process.env.FRONTEND_URL || 'http://docs.axiomacloud.com'}/reset-password?token=${resetToken}`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Recuperar Contraseña - AxiomaDocs</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #e2e8f0; }
          .button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; color: #64748b; font-size: 14px; }
          .warning { background: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 6px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔐 Recuperar Contraseña</h1>
            <p>AxiomaDocs - Sistema de Gestión Documental</p>
          </div>

          <div class="content">
            <h2>Hola ${userName},</h2>

            <p>Hemos recibido una solicitud para restablecer la contraseña de tu cuenta en AxiomaDocs.</p>

            <p>Si solicitaste este cambio, haz clic en el siguiente enlace para crear una nueva contraseña:</p>

            <p style="text-align: center;">
              <a href="${resetUrl}" class="button">Restablecer Contraseña</a>
            </p>

            <div class="warning">
              <strong>⚠️ Importante:</strong>
              <ul>
                <li>Este enlace expirará en <strong>1 hora</strong></li>
                <li>Solo puede ser utilizado una vez</li>
                <li>Si no solicitaste este cambio, puedes ignorar este email</li>
              </ul>
            </div>

            <p>Si tienes problemas con el enlace, puedes copiar y pegar la siguiente URL en tu navegador:</p>
            <p style="word-break: break-all; background: #f1f5f9; padding: 10px; border-radius: 4px; font-size: 12px;">
              ${resetUrl}
            </p>

            <p>Por seguridad, si no solicitaste este cambio, te recomendamos que contactes al administrador del sistema.</p>

            <p>Saludos,<br>
            <strong>Equipo AxiomaDocs</strong></p>
          </div>

          <div class="footer">
            <p>Este es un email automático, por favor no respondas a esta dirección.</p>
            <p>© ${new Date().getFullYear()} AxiomaDocs - Sistema de Gestión Documental</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
      Recuperar Contraseña - AxiomaDocs

      Hola ${userName},

      Hemos recibido una solicitud para restablecer la contraseña de tu cuenta.

      Para crear una nueva contraseña, visita el siguiente enlace:
      ${resetUrl}

      Este enlace expirará en 1 hora y solo puede ser utilizado una vez.

      Si no solicitaste este cambio, puedes ignorar este email.

      Saludos,
      Equipo AxiomaDocs
    `;

    return {
      to: userEmail,
      subject: '🔐 Recuperar Contraseña - AxiomaDocs',
      html,
      text,
    };
  }

  static generatePasswordChangedNotification(userEmail: string, userName: string): EmailTemplate {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Contraseña Actualizada - AxiomaDocs</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #16a34a; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #e2e8f0; }
          .success { background: #dcfce7; border: 1px solid #16a34a; padding: 15px; border-radius: 6px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; color: #64748b; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✅ Contraseña Actualizada</h1>
            <p>AxiomaDocs - Sistema de Gestión Documental</p>
          </div>

          <div class="content">
            <h2>Hola ${userName},</h2>

            <div class="success">
              <strong>✅ Tu contraseña ha sido actualizada exitosamente</strong>
            </div>

            <p>Te confirmamos que la contraseña de tu cuenta en AxiomaDocs ha sido cambiada correctamente.</p>

            <p><strong>Detalles del cambio:</strong></p>
            <ul>
              <li><strong>Fecha:</strong> ${new Date().toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })}</li>
              <li><strong>Usuario:</strong> ${userEmail}</li>
            </ul>

            <p>Si no realizaste este cambio, contacta inmediatamente al administrador del sistema.</p>

            <p>Saludos,<br>
            <strong>Equipo AxiomaDocs</strong></p>
          </div>

          <div class="footer">
            <p>Este es un email automático, por favor no respondas a esta dirección.</p>
            <p>© ${new Date().getFullYear()} AxiomaDocs - Sistema de Gestión Documental</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
      Contraseña Actualizada - AxiomaDocs

      Hola ${userName},

      Tu contraseña ha sido actualizada exitosamente.

      Fecha: ${new Date().toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })}
      Usuario: ${userEmail}

      Si no realizaste este cambio, contacta al administrador del sistema.

      Saludos,
      Equipo AxiomaDocs
    `;

    return {
      to: userEmail,
      subject: '✅ Contraseña Actualizada - AxiomaDocs',
      html,
      text,
    };
  }

  static async testConnection(): Promise<boolean> {
    try {
      await transporter.verify();
      console.log('✅ Conexión SMTP verificada exitosamente');
      return true;
    } catch (error) {
      console.error('❌ Error en conexión SMTP:', error);
      return false;
    }
  }
}