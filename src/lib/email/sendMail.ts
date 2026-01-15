import { Resend } from "resend";

type SendMailParams = {
  to: string[];
  subject: string;
  html: string;
};

export async function sendMail({ to, subject, html }: SendMailParams): Promise<void> {
  const resendApiKey = process.env.RESEND_API_KEY;
  const resendFromEmail = process.env.RESEND_FROM_EMAIL;

  if (!resendApiKey || !resendFromEmail) {
    throw new Error("Resend env variables are missing.");
  }

  const resend = new Resend(resendApiKey);

  await resend.emails.send({
    from: resendFromEmail,
    to,
    subject,
    html,
  });
}
