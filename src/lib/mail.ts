import nodemailer from "nodemailer";

interface SendEmailParams {
  to: string;
  subject: string;
  body: string;
  html?: string;
}

export async function sendEmail({
  to,
  subject,
  body,
  html,
}: SendEmailParams): Promise<{ success: boolean; message: string }> {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || `"StockEasy" <noreply@stockeasy.in>`;

  if (!host || !port || !user || !pass) {
    console.log(`[SMTP MOCK SIMULATION] (Missing SMTP environment variables)
      To: ${to}
      Subject: ${subject}
      Body: ${body}`);
    return {
      success: true,
      message: `Email simulated. To send real emails, configure SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASS in your environment variables.`,
    };
  }

  try {
    const isSecure = process.env.SMTP_SECURE === "true" || port === "465";
    const transporter = nodemailer.createTransport({
      host,
      port: parseInt(port, 10),
      secure: isSecure,
      auth: {
        user,
        pass,
      },
    });

    await transporter.sendMail({
      from,
      to,
      subject,
      text: body,
      html: html || body.replace(/\n/g, "<br>"),
    });

    return {
      success: true,
      message: `Email successfully sent to ${to}`,
    };
  } catch (error) {
    console.error("Failed to send email via SMTP:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "SMTP connection or transport failed",
    };
  }
}
