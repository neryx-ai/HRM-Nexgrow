import nodemailer from "nodemailer";
import { logger } from "@/lib/logger";

type SmtpConfig = {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
};

function getSmtpConfig(): SmtpConfig | null {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM;

  if (!host || !port || !user || !pass || !from) {
    return null;
  }

  return {
    host,
    port: parseInt(port, 10),
    user,
    pass,
    from,
  };
}

function createTransporter() {
  const config = getSmtpConfig();
  if (!config) return null;

  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.port === 465,
    auth: {
      user: config.user,
      pass: config.pass,
    },
  });
}

function isSmtpConfigured(): boolean {
  return getSmtpConfig() !== null;
}

async function sendEmail({
  to,
  subject,
  html,
  text,
}: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<boolean> {
  const config = getSmtpConfig();

  if (!config) {
    logger.warn(
      "EMAIL",
      "SMTP no configurado. No se envió el correo. Configurá las variables SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM en tu archivo .env",
    );
    logger.warn("EMAIL", `Datos del correo que no se envió:`, {
      to,
      subject,
    });
    return false;
  }

  const redirectTo = process.env.SMTP_TEST_EMAIL;
  if (redirectTo && redirectTo !== to) {
    logger.info("EMAIL", `[TEST MODE] Redirigiendo correo de ${to} → ${redirectTo}`);
    return sendEmail({
      to: redirectTo,
      subject: `[TEST → ${to}] ${subject}`,
      html,
      text,
    });
  }

  const transporter = createTransporter();
  if (!transporter) return false;

  try {
    const info = await transporter.sendMail({
      from: config.from,
      to,
      subject,
      html,
      text: text ?? html.replace(/<[^>]*>/g, ""),
    });

    logger.info("EMAIL", `Correo enviado exitosamente a ${to}`, {
      messageId: info.messageId,
      subject,
    });
    return true;
  } catch (error) {
    logger.error("EMAIL", `Error al enviar correo a ${to}`, error);
    return false;
  }
}

function buildWelcomeEmailHtml({
  name,
  email,
  tempPassword,
  loginUrl,
}: {
  name: string;
  email: string;
  tempPassword: string;
  loginUrl: string;
}): string {
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bienvenido a Jivis RRHH</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <tr>
            <td style="background-color: #1c1917; padding: 30px 40px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">Jivis — Sistema de RRHH</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px 0; color: #1c1917; font-size: 20px;">¡Bienvenido/a, ${name}!</h2>
              <p style="margin: 0 0 16px 0; color: #57534e; font-size: 15px; line-height: 1.6;">
                Se ha creado tu cuenta en el sistema de Recursos Humanos de Distribuidora Jivis S.A. A continuación encontrarás tus credenciales de acceso:
              </p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f4; border-radius: 6px; margin: 24px 0;">
                <tr>
                  <td style="padding: 20px 24px;">
                    <p style="margin: 0 0 8px 0; color: #78716c; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Correo electrónico</p>
                    <p style="margin: 0 0 16px 0; color: #1c1917; font-size: 15px; font-weight: 500;">${email}</p>
                    <p style="margin: 0 0 8px 0; color: #78716c; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Contraseña temporal</p>
                    <p style="margin: 0; color: #1c1917; font-size: 15px; font-weight: 500; font-family: 'Courier New', monospace; background-color: #ffffff; padding: 8px 12px; border-radius: 4px; display: inline-block; border: 1px solid #d6d3d1;">${tempPassword}</p>
                  </td>
                </tr>
              </table>
              <p style="margin: 0 0 24px 0; color: #dc2626; font-size: 14px; font-weight: 500;">
                ⚠ Por seguridad, deberás cambiar tu contraseña en el primer inicio de sesión.
              </p>
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
                <tr>
                  <td style="background-color: #1c1917; border-radius: 6px;">
                    <a href="${loginUrl}" style="display: inline-block; padding: 12px 32px; color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 500;">Iniciar sesión</a>
                  </td>
                </tr>
              </table>
              <p style="margin: 24px 0 0 0; color: #78716c; font-size: 13px; line-height: 1.6;">
                Si el botón no funciona, copiá y pegá este enlace en tu navegador:<br>
                <a href="${loginUrl}" style="color: #1c1917; word-break: break-all;">${loginUrl}</a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f5f5f4; padding: 20px 40px; text-align: center;">
              <p style="margin: 0; color: #a8a29e; font-size: 12px;">
                Distribuidora Jivis S.A. — Sistema de Gestión de Recursos Humanos
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buildResetPasswordEmailHtml({
  name,
  resetUrl,
}: {
  name: string;
  resetUrl: string;
}): string {
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Recuperar contraseña — Jivis RRHH</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <tr>
            <td style="background-color: #1c1917; padding: 30px 40px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">Jivis — Sistema de RRHH</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px 0; color: #1c1917; font-size: 20px;">Hola, ${name}</h2>
              <p style="margin: 0 0 24px 0; color: #57534e; font-size: 15px; line-height: 1.6;">
                Recibimos una solicitud para restablecer tu contraseña. Hacé clic en el botón de abajo para crear una nueva:
              </p>
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
                <tr>
                  <td style="background-color: #1c1917; border-radius: 6px;">
                    <a href="${resetUrl}" style="display: inline-block; padding: 12px 32px; color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 500;">Restablecer contraseña</a>
                  </td>
                </tr>
              </table>
              <p style="margin: 24px 0 0 0; color: #78716c; font-size: 13px; line-height: 1.6;">
                Si el botón no funciona, copiá y pegá este enlace en tu navegador:<br>
                <a href="${resetUrl}" style="color: #1c1917; word-break: break-all;">${resetUrl}</a>
              </p>
              <p style="margin: 16px 0 0 0; color: #a8a29e; font-size: 13px; line-height: 1.6;">
                Si no solicitaste este cambio, podés ignorar este correo. Tu contraseña seguirá siendo la misma.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f5f5f4; padding: 20px 40px; text-align: center;">
              <p style="margin: 0; color: #a8a29e; font-size: 12px;">
                Distribuidora Jivis S.A. — Sistema de Gestión de Recursos Humanos
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export const emailService = {
  sendEmail,
  isSmtpConfigured,
  buildWelcomeEmailHtml,
  buildResetPasswordEmailHtml,
};
