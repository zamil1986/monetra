import { Resend } from "resend";

const from = process.env.EMAIL_FROM ?? "Monetra <onboarding@resend.dev>";
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

/** Sends through Resend; without RESEND_API_KEY (local dev) the message goes to the server log. */
export async function sendEmail(message: { to: string; subject: string; text: string }) {
  if (!resend) {
    console.info(`[email] to=${message.to} subject=${message.subject}\n${message.text}`);
    return;
  }
  const { error } = await resend.emails.send({ from, ...message });
  if (error) console.error("[email] Resend refused the message", error);
}
