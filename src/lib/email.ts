import nodemailer from "nodemailer";

export function isEmailConfigured(): boolean {
  return Boolean(
    process.env.SMTP_HOST &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS &&
      process.env.SMTP_FROM
  );
}

function createTransporter() {
  const host = process.env.SMTP_HOST!;
  const port = Number(process.env.SMTP_PORT ?? "465");
  const secure = port === 465;

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user: process.env.SMTP_USER!,
      pass: process.env.SMTP_PASS!,
    },
    ...(port === 587 ? { requireTLS: true } : {}),
  });
}

export async function sendOtpEmail(
  to: string,
  otp: string,
  subject: string
): Promise<{ sent: boolean; error?: string }> {
  if (!isEmailConfigured()) {
    console.warn("[email] SMTP env vars missing — email not sent to", to);
    return { sent: false, error: "SMTP not configured" };
  }

  const from = process.env.SMTP_FROM!;
  const appName = process.env.NEXT_PUBLIC_APP_NAME ?? "Sugg";

  try {
    const transporter = createTransporter();
    await transporter.sendMail({
      from,
      to,
      subject: `${appName} — ${subject}`,
      text: `Your verification code is: ${otp}\n\nThis code expires in 30 minutes. Do not share it with anyone.`,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
          <h2 style="color:#111">${appName}</h2>
          <p>Your verification code is:</p>
          <p style="font-size:32px;font-weight:bold;letter-spacing:6px;color:#2563eb">${otp}</p>
          <p style="color:#666;font-size:14px">This code expires in 30 minutes. Do not share it with anyone.</p>
        </div>
      `,
    });
    console.info("[email] OTP sent to", to);
    return { sent: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown email error";
    console.error("[email] Send failed:", message, err);
    return { sent: false, error: message };
  }
}
