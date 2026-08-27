# Google Apps Script CRM

This directory contains the `v1` Web App backend for structured VO generation, monthly editorial plans, Mercado Pago checkout, payment webhooks, email notifications, sales chat, orders, briefs, video records, tickets, feedback and status lookup.

## Recommended setup

1. Create a new Google Sheet for the CRM.
2. In the Sheet, open `Extensions -> Apps Script`.
3. Create Apps Script files matching the files in this directory and paste their contents.
4. Open Project Settings, enable the manifest editor and replace `appsscript.json`.
5. Run `setupCrm()` once from the Apps Script editor and approve the Sheets, external request and email permissions.
6. Confirm that nine tabs were created: `ORDERS`, `PAYMENTS`, `BRIEFS`, `VIDEOS`, `TICKETS`, `FEEDBACK`, `CHAT_LOGS`, `EMAIL_LOG`, `EVENTS`.
7. Choose `Deploy -> New deployment -> Web app`.
8. Set `Execute as: Me` and choose the audience required for the public landing page.
9. Copy the production URL ending in `/exec`.
10. Add it to the site `.env` as `VITE_APPS_SCRIPT_ENDPOINT` and rebuild the site.

When updating an existing project, create and paste `Payments.gs` and `Email.gs`, replace the changed `.gs` files, and run `setupCrm()` again. It adds new columns without deleting existing CRM rows. Replace the manifest when its scopes change.

## Mercado Pago configuration

Keep the Mercado Pago access token in Apps Script Properties, never in the site `.env`.

Add these Script Properties:

```text
MERCADO_PAGO_ACCESS_TOKEN=your_private_access_token
MERCADO_PAGO_USE_SANDBOX=false
MERCADO_PAGO_WEBHOOK_URL=https://your-worker.workers.dev/
SITE_BASE_URL=https://your-public-site.com
WEBAPP_URL=https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
STUDIO_NOTIFICATION_EMAIL=your-contact-email@example.com
```

For sandbox tests, use a Mercado Pago test access token and set:

```text
MERCADO_PAGO_USE_SANDBOX=true
```

Webhook URL for Mercado Pago should use the Cloudflare Worker proxy when Apps Script redirects are not accepted by Mercado Pago:

```text
https://your-worker.workers.dev/
```

The Worker forwards the notification to:

```text
https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec?webhook=mercadopago
```

Recommended Mercado Pago event:

```text
Payment
```

`create_payment` creates a Checkout Pro preference and returns the hosted Mercado Pago checkout link. `payment_webhook` receives the payment notification, fetches the payment from Mercado Pago by ID, verifies the order reference and amount, updates `PAYMENTS` and `ORDERS`, queues monthly VO generation and sends email notifications.

## Monthly script lifecycle

Before payment, the API returns exactly 4 or 8 editable editorial topics and the full VO only for video 1. `create_order` creates one child row per video in `VIDEOS`:

- video 1: `APPROVED_PREPAYMENT`;
- remaining videos: `WAITING_PAYMENT`.

After Mercado Pago confirms the parent order as `Payment_Status = PAID`, the webhook queues the remaining monthly VO texts. The background worker then generates them one at a time. It never generates storyboard or scene directions.

To activate the worker in Apps Script:

1. Open `Triggers` in the left sidebar.
2. Add a trigger for `processPendingVideoScripts`.
3. Choose `Time-driven` and an interval such as every minute.
4. Approve the requested permissions.

The worker ignores unpaid orders. The verified payment webhook calls `wbQueueRemainingScripts_(orderId)` immediately; the time trigger remains a recovery mechanism.

## Email notifications

Emails are sent through `MailApp` and logged in `EMAIL_LOG`.

Automatic templates:

- `order_created`: after the order is saved before payment;
- `payment_link_created`: after the Mercado Pago checkout link is created;
- `payment_confirmed`: after Mercado Pago verifies an approved payment;
- `payment_status_changed`: failed, cancelled or refunded payment updates;
- `scripts_ready`: when all remaining monthly VOs are ready for review.

The preview generation also creates a compact `Source_Digest` from the written brief. It is saved with the approved topics and first VO, then reused by the worker for every remaining monthly script. The worker never fetches an external document after payment.

The client review page is `/roteiros`. The actions `get_video_scripts` and `approve_video_scripts` require the matching Order ID and email, expose only that order's VO texts, save client edits and notes to `VIDEOS`, and move the parent order to `SCRIPTS_APPROVED` only after every text is approved.

## AI configuration

Keep the AI key in Apps Script, never in the site `.env`.

1. Open `Project Settings` in Apps Script.
2. Under `Script Properties`, add the provider values.
3. Save the properties.
4. Run `checkAiConfig()` from the editor.
5. Confirm `configured: true`; the function never returns the key.

Recommended Gemini setup:

```text
LLM_PROVIDER=gemini
LLM_API_KEY=your_key_from_google_ai_studio
LLM_MODEL=gemini-3.6-flash
LLM_BASE_URL=https://generativelanguage.googleapis.com/v1beta
```

`LLM_BASE_URL` is optional for Gemini. Use a model currently available to your AI Studio project.

OpenAI-compatible setup:

```text
LLM_PROVIDER=openai_compatible
LLM_API_KEY=your_provider_key
LLM_MODEL=your_model_name
LLM_BASE_URL=https://api.openai.com/v1
```

The OpenAI-compatible adapter uses `/chat/completions`. Both providers receive only the written brief; document and external-page ingestion are deliberately outside the public MVP.

## Preview usage limits

- 5 successfully completed previews per email in a rolling 60-minute window;
- the API returns the remaining attempts and reset time for the client countdown;
- written-input limits are dynamic: `ready_text` allows 3,000 / 6,000 / 8,000 characters for 1 / 4 / 8 videos, while `idea` allows 1,200 / 2,000 / 3,000;
- failed AI or transport attempts do not consume the visible preview quota;
- large sources must be reduced to the relevant facts, chapters or excerpts before preview generation.

The public brief supports only `ready_text` and `idea`. It does not fetch PDF files, Google Drive documents or websites. This keeps every source fact visible for client approval before checkout and removes external-access failures from the generation path.

After changing the manifest or source files, update the existing deployment with a **new version**. Keeping the same deployment preserves the `/exec` URL.

## Knowledge base

The source of truth is `knowledge/*.md`. Generate the Apps Script bundle after editing those files:

```powershell
pnpm run build:knowledge
```

Then paste the refreshed `apps-script/Knowledge.gs` into Apps Script and deploy a new version.

The development URL ending in `/dev` is only for editors of the Apps Script project. Use the deployed `/exec` URL in the site.

## Health check

Open the deployed `/exec` URL in a browser. A configured deployment returns JSON similar to:

```json
{
  "ok": true,
  "version": "v1",
  "requestId": "health",
  "data": {
    "service": "whiteboard-sales-api",
    "version": "v1",
    "spreadsheetReady": true
  }
}
```

## Standalone Apps Script project

If the Apps Script project is not opened from the CRM Sheet, run:

```javascript
setupCrmWithSpreadsheetId("YOUR_SPREADSHEET_ID");
```

The spreadsheet ID is saved in Apps Script Properties. It is not sent to the browser.

## Pricing source of truth

`Config.gs` contains `WB_PACKAGE_RULES` and `WB_PLAN_RULES`. Apps Script recalculates the total and delivery date instead of trusting values sent by the browser. When prices change, update the matching display values in `src/content.ts` and the authoritative backend rules in `apps-script/Config.gs`.

## Deploying changes

Saving source code does not update an existing production deployment automatically. Create a new version from `Deploy -> Manage deployments`, update the deployment and keep the same `/exec` URL.

## Security boundary

This is a public form endpoint, not an authenticated client portal. It validates data, limits field size, applies a basic per-session AI throttle, prevents formula injection and protects status/ticket/feedback actions with Order ID plus email. Payment status is verified by fetching the payment from Mercado Pago instead of trusting the webhook body alone. Before paid traffic, add an anti-abuse layer such as Turnstile or a proxy with stronger rate limiting.
