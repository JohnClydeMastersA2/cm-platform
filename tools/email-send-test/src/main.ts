import dotenv from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { sendEmail } from "@cm/email";
import { loadEnv } from "./config/env.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({
  path: resolve(__dirname, "..", ".env"),
  quiet: true,
});

const env = loadEnv();
const to = env.recipients;
const sentAt = new Date().toISOString();
const subject = "CM Platform email send test";
const html = `
  <div style="font-family: Arial, sans-serif; line-height: 1.5;">
    <h1 style="font-size: 20px;">CM Platform email send test</h1>
    <p>This message was sent by a standalone client using @cm/email.</p>
    <p><strong>Sent at:</strong> ${escapeHtml(sentAt)}</p>
  </div>`;

// Build the plain-text body from lines so paragraph breaks stay intentional and easy to edit.
const text = [
  "CM Platform email send test",
  "",
  "This message was sent by a standalone client using @cm/email.",
  `Sent at: ${sentAt}`,
].join("\n");

const results = [];

for (const recipient of to) {
  const result = await sendEmail({
    to: recipient,
    subject,
    html,
    text,
  });

  results.push({
    recipient,
    result,
  });
}

console.log("Email send test completed.");

for (const { recipient, result } of results) {
  console.log(`Recipient: ${recipient}`);
  console.log(`Message ID: ${result.messageId}`);
  console.log(`Accepted: ${result.accepted.join(", ") || "(none)"}`);
  console.log(`Rejected: ${result.rejected.join(", ") || "(none)"}`);
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
