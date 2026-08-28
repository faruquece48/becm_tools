import nodemailer from "nodemailer";

function gmailCredentials() {
  return { user: process.env.GMAIL_USER || "", pass: (process.env.GMAIL_APP_PASSWORD || "").replace(/\s+/g, "") };
}

export function gmailConfigured() {
  const { user, pass } = gmailCredentials();
  return Boolean(user && pass);
}

export async function sendAccountEmail(to: string, subject: string, text: string) {
  const auth = gmailCredentials();
  if (!auth.user || !auth.pass) throw new Error("Gmail is not configured");
  const transporter = nodemailer.createTransport({ service: "gmail", auth });
  await transporter.sendMail({ from: `BECM Tools <${auth.user}>`, to, subject, text });
}