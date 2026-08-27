import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const appsScriptDir = join(projectRoot, "apps-script");
const files = readdirSync(appsScriptDir).filter((file) => file.endsWith(".gs"));

for (const file of files) {
  const source = readFileSync(join(appsScriptDir, file), "utf8");
  try {
    new Function(source);
  } catch (error) {
    throw new Error(`${file}: ${error.message}`);
  }
}

const config = readFileSync(join(appsScriptDir, "Config.gs"), "utf8");
for (const sheet of ["ORDERS", "PAYMENTS", "BRIEFS", "VIDEOS", "TICKETS", "FEEDBACK", "CHAT_LOGS", "EMAIL_LOG", "EVENTS"]) {
  if (!config.includes(`${sheet}:`)) throw new Error(`Missing sheet schema: ${sheet}`);
}

for (const action of ["generate_roteiro", "chat", "log_chat", "create_order", "create_payment", "payment_webhook", "lookup_order", "get_video_scripts", "approve_video_scripts", "create_ticket", "create_feedback", "log_event", "send_email"]) {
  if (!config.includes(`${action}: true`)) throw new Error(`Missing API action: ${action}`);
}

const manifest = readFileSync(join(appsScriptDir, "appsscript.json"), "utf8");
if (!manifest.includes("script.external_request")) throw new Error("Apps Script manifest must allow external AI requests");
if (!manifest.includes("script.send_mail")) throw new Error("Apps Script manifest must allow email notifications");

const aiSource = readFileSync(join(appsScriptDir, "AI.gs"), "utf8");
if (!aiSource.includes("PropertiesService.getScriptProperties()")) {
  throw new Error("AI credentials must come from Script Properties");
}

const paymentSource = readFileSync(join(appsScriptDir, "Payments.gs"), "utf8");
if (!paymentSource.includes("WB_MP_ACCESS_TOKEN_PROPERTY")) {
  throw new Error("Mercado Pago access token must come from Script Properties");
}

console.log(`Apps Script validation passed: ${files.length} source files.`);
