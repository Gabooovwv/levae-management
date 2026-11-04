import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export type OutgoingMail = {
  to: string;
  subject: string;
  body: string;
};

function safeName(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9._@-]+/gi, "_");
}

function stamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

/** Localhost / dev: log emails under /emails. No real SMTP send. */
export async function sendMail(mail: OutgoingMail) {
  const dir = path.join(process.cwd(), "emails");
  await mkdir(dir, { recursive: true });
  const filename = `${safeName(mail.to)}.${stamp()}.txt`;
  const content = [
    `To: ${mail.to}`,
    `Subject: ${mail.subject}`,
    `Date: ${new Date().toISOString()}`,
    "",
    mail.body.trim(),
    "",
  ].join("\n");
  await writeFile(path.join(dir, filename), content, "utf8");
  return { ok: true as const, file: filename };
}

export async function sendMails(mails: OutgoingMail[]) {
  for (const mail of mails) {
    await sendMail(mail);
  }
}
