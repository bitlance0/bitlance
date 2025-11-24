// import nodemailer from "nodemailer";

// export type MailPayload = { to: string; subject: string; html: string; text?: string };

// let _transporter: nodemailer.Transporter | null = null;

// /**
//  * Usa SMTP (SendGrid, Mailgun, Mailersend, SES, etc.)
//  * En Render, el outbound a 587 funciona bien. Evita puertos bloqueados.
//  */
// export function getTransporter() {
//   if (_transporter) return _transporter;
//   const host = process.env.SMTP_HOST!;
//   const port = Number(process.env.SMTP_PORT || 587);
//   const user = process.env.SMTP_USER!;
//   const pass = process.env.SMTP_PASS!;
//   const secure = port === 465; // true para 465, false para 587/25

//   _transporter = nodemailer.createTransport({
//     host,
//     port,
//     secure,
//     auth: { user, pass },
//     // Si tu SMTP necesita TLS relajado (no recomendado):
//     // tls: { rejectUnauthorized: false }
//   });

//   return _transporter;
// }

// export async function sendMail({ to, subject, html, text }: MailPayload) {
//   const from = process.env.EMAIL_FROM || "no-reply@tudominio.com";
//   const transporter = getTransporter();
//   await transporter.sendMail({ from, to, subject, html, text });
// }

// src/lib/mailer.ts
import nodemailer from "nodemailer";

export type MailPayload = { to: string; subject: string; html: string; text?: string };

let _transporter: nodemailer.Transporter | null = null;
let _useEthereal = false;

export async function getTransporter() {
  if (_transporter) return _transporter;

  // Si estás en dev y NO tienes SMTP configurado, usa Ethereal
  const hasSMTP =
    !!process.env.SMTP_HOST && !!process.env.SMTP_PORT && !!process.env.SMTP_USER && !!process.env.SMTP_PASS;

  if (process.env.NODE_ENV !== "production" && !hasSMTP) {
    const testAccount = await nodemailer.createTestAccount();
    _transporter = nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    _useEthereal = true;
    // Info útil en consola
    console.log("✅ Usando Ethereal SMTP de pruebas.");
    console.log("   Usuario:", testAccount.user);
    console.log("   Pass   :", testAccount.pass);
    return _transporter;
  }

  // SMTP real (producción o cuando quieras probar con tu proveedor)
  const host = process.env.SMTP_HOST!;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER!;
  const pass = process.env.SMTP_PASS!;
  const secure = port === 465;

  _transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });

  return _transporter;
}

export async function sendMail({ to, subject, html, text }: MailPayload) {
  const from = process.env.EMAIL_FROM || "no-reply@example.com";
  const transporter = await getTransporter();
  const info = await transporter.sendMail({ from, to, subject, html, text });

  // En dev con Ethereal, imprime el preview URL
  if (_useEthereal) {
    const url = nodemailer.getTestMessageUrl(info);
    if (url) {
      console.log("✉️  Preview Email URL:", url);
    }
  }
}
