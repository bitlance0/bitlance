import crypto from "crypto";
import { sendMail } from "./mailer";

export function hashToken(raw: string) {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

export function generateToken() {
  return crypto.randomUUID();
}

export async function sendVerificationEmail({
  to,
  verifyUrl,
  subject = "Verifica tu correo",
}: {
  to: string;
  verifyUrl: string;
  subject?: string;
}) {
  const html = `
    <div style="font-family:ui-sans-serif,system-ui">
      <h2>Confirma tu correo</h2>
      <p>Gracias por registrarte en <strong>BitLance</strong>.</p>
      <p>Para activar tu cuenta, haz clic en el siguiente botón:</p>
      <p>
        <a href="${verifyUrl}" style="display:inline-block;padding:10px 16px;border-radius:8px;background:#ffd633;color:#111;text-decoration:none;font-weight:600">
          Verificar correo
        </a>
      </p>
      <p>Si el botón no funciona, copia y pega este enlace en tu navegador:</p>
      <p><a href="${verifyUrl}">${verifyUrl}</a></p>
      <p style="color:#666">Este enlace expira en 24 horas.</p>
    </div>
  `;
  const text = `Confirma tu correo: ${verifyUrl}\nEste enlace expira en 24 horas.`;

  await sendMail({ to, subject, html, text });
}
