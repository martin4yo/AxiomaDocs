import { EmailService } from './src/services/emailService';
import * as dotenv from 'dotenv';

dotenv.config();

async function testEmail() {
  console.log('🧪 Probando servicio de email...\n');

  // Verificar conexión SMTP
  console.log('=== VERIFICANDO CONEXIÓN SMTP ===');
  const connectionOk = await EmailService.testConnection();

  if (!connectionOk) {
    console.log('❌ No se pudo conectar al servidor SMTP');
    return;
  }

  // Probar email de recuperación de contraseña
  console.log('\n=== PROBANDO EMAIL DE RECUPERACIÓN ===');
  const resetEmail = EmailService.generatePasswordResetEmail(
    'test@example.com',
    'Usuario Test',
    'test-token-123456789'
  );

  console.log('Template generado:');
  console.log('- Para:', resetEmail.to);
  console.log('- Asunto:', resetEmail.subject);
  console.log('- HTML length:', resetEmail.html.length, 'caracteres');
  console.log('- Text length:', resetEmail.text?.length, 'caracteres');

  // Enviar email de prueba (opcional)
  const testEmailAddress = process.env.SMTP_USER; // Enviar a nosotros mismos
  if (testEmailAddress) {
    console.log(`\n📧 Enviando email de prueba a ${testEmailAddress}...`);

    const testEmail = {
      to: testEmailAddress,
      subject: '🧪 Prueba de Email - AxiomaDocs',
      html: `
        <h2>Prueba de Email AxiomaDocs</h2>
        <p>Este es un email de prueba del sistema de recuperación de contraseñas.</p>
        <p><strong>Fecha:</strong> ${new Date().toLocaleString('es-AR')}</p>
        <p><strong>Sistema:</strong> AxiomaDocs</p>
        <hr>
        <p><em>Si recibes este email, la configuración está funcionando correctamente.</em></p>
      `,
      text: `
        Prueba de Email AxiomaDocs

        Este es un email de prueba del sistema de recuperación de contraseñas.
        Fecha: ${new Date().toLocaleString('es-AR')}
        Sistema: AxiomaDocs

        Si recibes este email, la configuración está funcionando correctamente.
      `
    };

    const emailSent = await EmailService.sendEmail(testEmail);

    if (emailSent) {
      console.log('✅ Email de prueba enviado exitosamente');
    } else {
      console.log('❌ Error enviando email de prueba');
    }
  }

  console.log('\n=== CONFIGURACIÓN ACTUAL ===');
  console.log('SMTP_HOST:', process.env.SMTP_HOST);
  console.log('SMTP_PORT:', process.env.SMTP_PORT);
  console.log('SMTP_USER:', process.env.SMTP_USER);
  console.log('SMTP_PASS:', process.env.SMTP_PASS ? '***configurado***' : 'NO CONFIGURADO');
  console.log('FRONTEND_URL:', process.env.FRONTEND_URL);

  console.log('\n✅ Prueba de email completada');
}

testEmail().catch(console.error);