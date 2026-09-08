import nodemailer from "nodemailer";
import { logger } from "@/lib/logger";

export type EmailSendResult = {
  success: boolean;
  error?: string;
  code?: string;
  messageId?: string;
};

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
  const result = await sendEmailInternal({
    to,
    subject,
    html,
    text,
    attachments: undefined,
  });
  return result.success;
}

async function sendEmailWithAttachment({
  to,
  subject,
  html,
  text,
  attachments,
}: {
  to: string;
  subject: string;
  html: string;
  text?: string;
  attachments: Array<{ filename: string; content: Buffer; contentType?: string }>;
}): Promise<boolean> {
  const result = await sendEmailInternal({
    to,
    subject,
    html,
    text,
    attachments,
  });
  return result.success;
}

async function sendEmailWithResult({
  to,
  subject,
  html,
  text,
  attachments,
}: {
  to: string;
  subject: string;
  html: string;
  text?: string;
  attachments?: Array<{ filename: string; content: Buffer; contentType?: string }>;
}): Promise<EmailSendResult> {
  return sendEmailInternal({ to, subject, html, text, attachments });
}

async function sendEmailInternal({
  to,
  subject,
  html,
  text,
  attachments,
}: {
  to: string;
  subject: string;
  html: string;
  text?: string;
  attachments?: Array<{ filename: string; content: Buffer; contentType?: string }>;
}): Promise<EmailSendResult> {
  const config = getSmtpConfig();

  if (!config) {
    const mensaje =
      "SMTP no configurado. Definí SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS y SMTP_FROM en el entorno.";
    logger.warn("EMAIL", `${mensaje} No se envió el correo a ${to}.`);
    logger.warn("EMAIL", `Datos del correo que no se envió:`, {
      to,
      subject,
      hasAttachments: !!attachments?.length,
    });
    return { success: false, error: mensaje, code: "SMTP_NOT_CONFIGURED" };
  }

  const redirectTo = process.env.SMTP_TEST_EMAIL;
  if (redirectTo && redirectTo !== to) {
    logger.info("EMAIL", `[TEST MODE] Redirigiendo correo de ${to} → ${redirectTo}`);
    return sendEmailInternal({
      to: redirectTo,
      subject: `[TEST → ${to}] ${subject}`,
      html,
      text,
      attachments,
    });
  }

  const transporter = createTransporter();
  if (!transporter) {
    const mensaje = "No se pudo crear el transportador SMTP.";
    logger.error("EMAIL", mensaje);
    return { success: false, error: mensaje, code: "TRANSPORTER_ERROR" };
  }

  try {
    const info = await transporter.sendMail({
      from: config.from,
      to,
      subject,
      html,
      text: text ?? html.replace(/<[^>]*>/g, ""),
      attachments: attachments?.map((a) => ({
        filename: a.filename,
        content: a.content,
        contentType: a.contentType,
      })),
    });

    logger.info("EMAIL", `Correo enviado exitosamente a ${to}`, {
      messageId: info.messageId,
      subject,
      attachments: attachments?.length ?? 0,
    });
    return { success: true, messageId: info.messageId };
  } catch (error) {
    const mensaje = extraerMensajeError(error);
    logger.error(
      "EMAIL",
      `Error al enviar correo a ${to}: ${mensaje}`,
      error,
    );
    return {
      success: false,
      error: mensaje,
      code: "SEND_ERROR",
    };
  }
}

function extraerMensajeError(error: unknown): string {
  if (error instanceof Error) {
    if (error.message && error.message.trim().length > 0) {
      return error.message;
    }
    return error.name || "Error desconocido del transportador SMTP";
  }
  if (typeof error === "string") return error;
  try {
    return JSON.stringify(error);
  } catch {
    return "Error desconocido al enviar el correo";
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

function buildVacacionOtorgadaEmailHtml({
  nombre,
  dias,
  fechaInicio,
  fechaFin,
  motivo,
  saldoRestante,
}: {
  nombre: string;
  dias: number;
  fechaInicio: string;
  fechaFin: string;
  motivo: string;
  saldoRestante: number;
}): string {
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Vacaciones otorgadas — Jivis RRHH</title>
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
              <h2 style="margin: 0 0 20px 0; color: #1c1917; font-size: 20px;">Hola, ${nombre}</h2>
              <p style="margin: 0 0 16px 0; color: #57534e; font-size: 15px; line-height: 1.6;">
                Te informamos que tu empleador te ha otorgado vacaciones. Adjuntamos a este correo la boleta oficial en formato PDF.
              </p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f4; border-radius: 6px; margin: 24px 0;">
                <tr>
                  <td style="padding: 20px 24px;">
                    <p style="margin: 0 0 12px 0; color: #78716c; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Período otorgado</p>
                    <p style="margin: 0 0 4px 0; color: #1c1917; font-size: 15px; font-weight: 500;">Desde: <strong>${fechaInicio}</strong></p>
                    <p style="margin: 0 0 12px 0; color: #1c1917; font-size: 15px; font-weight: 500;">Hasta: <strong>${fechaFin}</strong></p>
                    <p style="margin: 0 0 12px 0; color: #1c1917; font-size: 15px; font-weight: 500;">Días hábiles: <strong>${dias}</strong></p>
                    <p style="margin: 0; color: #78716c; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Motivo / nota</p>
                    <p style="margin: 4px 0 0 0; color: #1c1917; font-size: 14px;">${motivo}</p>
                  </td>
                </tr>
              </table>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #ecfdf5; border-radius: 6px; margin: 24px 0; border-left: 4px solid #059669;">
                <tr>
                  <td style="padding: 16px 20px;">
                    <p style="margin: 0; color: #065f46; font-size: 14px;">
                      <strong>Saldo restante de vacaciones:</strong> ${saldoRestante} día(s).
                    </p>
                  </td>
                </tr>
              </table>
              <p style="margin: 0 0 8px 0; color: #57534e; font-size: 14px; line-height: 1.6;">
                Si tenés alguna duda, contactá al equipo de RRHH.
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

function buildSolicitudPersonalResueltaEmailHtml({
  nombre,
  tipo,
  accion,
  fechaInicio,
  fechaFin,
  dias,
  nota,
}: {
  nombre: string;
  tipo: string;
  accion: "aprobada" | "rechazada";
  fechaInicio: string;
  fechaFin: string;
  dias: number;
  nota?: string | null;
}): string {
  const tipoLegible: Record<string, string> = {
    dia_libre: "día libre",
    permiso: "permiso",
    incapacidad: "incapacidad",
  };
  const accionLegible = accion === "aprobada" ? "aprobada" : "rechazada";
  const colorTitulo = accion === "aprobada" ? "#059669" : "#dc2626";
  const colorFondo = accion === "aprobada" ? "#ecfdf5" : "#fef2f2";
  const colorBorde = accion === "aprobada" ? "#059669" : "#dc2626";

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Solicitud ${accionLegible} — Jivis RRHH</title>
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
              <h2 style="margin: 0 0 20px 0; color: ${colorTitulo}; font-size: 20px;">Hola, ${nombre}</h2>
              <p style="margin: 0 0 16px 0; color: #57534e; font-size: 15px; line-height: 1.6;">
                Tu solicitud de <strong>${tipoLegible[tipo] ?? tipo}</strong> fue <strong>${accionLegible}</strong>.
              </p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f4; border-radius: 6px; margin: 24px 0;">
                <tr>
                  <td style="padding: 20px 24px;">
                    <p style="margin: 0 0 4px 0; color: #1c1917; font-size: 15px;">Desde: <strong>${fechaInicio}</strong></p>
                    <p style="margin: 0 0 4px 0; color: #1c1917; font-size: 15px;">Hasta: <strong>${fechaFin}</strong></p>
                    <p style="margin: 0; color: #1c1917; font-size: 15px;">Días hábiles: <strong>${dias}</strong></p>
                  </td>
                </tr>
              </table>
              ${
                nota
                  ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: ${colorFondo}; border-radius: 6px; margin: 24px 0; border-left: 4px solid ${colorBorde};">
                <tr>
                  <td style="padding: 16px 20px;">
                    <p style="margin: 0; color: #1c1917; font-size: 14px;">
                      <strong>Nota de RRHH:</strong> ${nota}
                    </p>
                  </td>
                </tr>
              </table>`
                  : ""
              }
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
  sendEmailWithAttachment,
  sendEmailWithResult,
  isSmtpConfigured,
  buildWelcomeEmailHtml,
  buildResetPasswordEmailHtml,
  buildVacacionOtorgadaEmailHtml,
  buildSolicitudPersonalResueltaEmailHtml,
};
