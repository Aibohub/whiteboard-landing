# Whiteboard para Negócios Sales System

Landing page PT-BR for selling whiteboard explainer videos. The current iteration adds Apps Script-backed AI roteiro generation and an AI sales chat grounded in the Markdown knowledge base.

## Current MVP Flow

```text
Package CTA
→ /brief
→ AI roteiro base generation
→ client approval checkbox
→ /checkout
→ Order ID with PAYMENT_PENDING
→ test payment confirmation
→ /order-success
```

Support and feedback now use dedicated routes:

```text
/support
/feedback
```

WhatsApp is not part of the main sales, support, checkout, status or footer flow.

## Routes

- `/` landing page
- `/brief` package brief, flexible input and roteiro approval
- `/checkout` order summary and Mercado Pago-ready payment step
- `/order-success` confirmation after payment test
- `/support` ticket form and order lookup by Order ID + email
- `/feedback` feedback form with separate portfolio permissions

## Configuration

Create `.env` from `.env.example`:

```powershell
Copy-Item .env.example .env
```

Environment variables:

```text
VITE_APPS_SCRIPT_ENDPOINT=
VITE_MERCADO_PAGO_PUBLIC_KEY=
```

Do not store LLM API keys or Mercado Pago access tokens in frontend env variables. Those belong in Google Apps Script properties or another secure backend.

## Google Apps Script Endpoint

Frontend config lives in `src/content.ts`:

```ts
siteConfig.appsScriptEndpoint
```

Implemented now:

```text
create_brief
generate_roteiro
create_order
lookup_order
create_ticket
create_feedback
chat
log_chat
log_event
```

Reserved in the contract for the next mini-iteration:

```text
create_payment
payment_webhook
send_email
```

When `VITE_APPS_SCRIPT_ENDPOINT` is configured, AI roteiro, chat, orders, status lookup, tickets and feedback use Apps Script. Without it, the site keeps a local roteiro fallback for layout testing; AI chat stays unavailable.

See `apps-script/README.md` for deployment and `docs/API_CONTRACT_V1.md` for request and response contracts. The Google Sheets ID is kept in Apps Script Properties and is not exposed to the frontend.

## Mercado Pago

Frontend only prepares the checkout step and public key placeholder.

Required secure backend behavior:

```text
approved roteiro
→ create Order ID with PAYMENT_PENDING
→ create Mercado Pago preference in backend
→ redirect to checkout link
→ webhook updates PAID / FAILED / CANCELLED / REFUNDED
→ Google Sheets updates order/payment rows
```

Never expose Mercado Pago access token in frontend.

## Google Sheets CRM

Running `setupCrm()` creates and maintains these tabs without deleting existing columns:

```text
ORDERS
PAYMENTS
BRIEFS
TICKETS
FEEDBACK
CHAT_LOGS
EMAIL_LOG
EVENTS
```

The backend upserts orders and briefs, protects lookup with Order ID + email, stores tickets and feedback, and updates testimonial/video permissions independently.

## AI Chat

MVP widget choice is fixed:

```text
ai-chat-widget as frontend/reference implementation
```

Rules:

- use widget UI/client logic only;
- do not expose LLM API keys in frontend;
- send chat requests to `VITE_APPS_SCRIPT_ENDPOINT`;
- use Markdown knowledge files in `knowledge/`;
- require Order ID + email for order lookup.

The widget now sends chat messages to Apps Script, persists a bounded local history, includes URL/title page context and stores both sides of the conversation in `CHAT_LOGS`. It uses the selected `ai-chat-widget` architecture as a frontend/reference implementation without deploying its Python backend.

AI keys are configured in Apps Script Properties. See `apps-script/README.md` for Gemini and OpenAI-compatible provider settings.

## Knowledge Base

Markdown files live in:

```text
knowledge/
```

Current files:

- `company.md`
- `packages.md`
- `faq.md`
- `objections.md`
- `brief-rules.md`
- `payment-rules.md`
- `delivery-rules.md`
- `revision-policy.md`
- `ticket-policy.md`
- `feedback-policy.md`
- `portfolio-permission.md`
- `order-status-rules.md`
- `niche-real-estate.md`
- `niche-pousadas.md`
- `niche-construction.md`

## Package Prices And Calculator

Edit `src/content.ts`, array `packages`:

```text
Basic 30s: R$ 149
Standard 60s: R$ 297
Premium 120s: R$ 597
```

Express delivery:

```text
+R$ 80 / +R$ 100 / +R$ 150
```

Monthly is selected inside every package:

```text
1 video: no discount
4 videos/month: 10% discount
8 videos/month: 15% discount
```

The additional 9:16 + 16:9 version costs `R$ 40 / R$ 70 / R$ 120` per video. Pricing rules live in `src/content.ts`; calculation and saved breakdown live in `src/salesFlow.ts`.

Apps Script recalculates the same values from `apps-script/Config.gs` and treats the backend result as authoritative. Update both files when commercial prices change.

Reference materials use public HTTPS links only. The brief accepts PDF, Google Drive, Google Docs, website or offer-page links and asks the client what should be used from the material. File storage and direct uploads are intentionally outside this iteration.

With Gemini, a public PDF up to 4 MB can be passed directly to the model. Public Google Docs, HTML and text pages are extracted into bounded text context. Private network URLs are rejected. Other AI providers should use text/Google Docs context instead of direct PDF input.

## Test Locally

```powershell
pnpm install
pnpm run dev
```

Open:

```text
http://127.0.0.1:5173/
```

Test brief/checkout:

1. Open `/brief?package=standard-60`.
2. Fill name, email, niche and idea.
3. Generate roteiro base.
4. Approve the roteiro.
5. Continue to checkout.
6. Confirm test payment.
7. Check `/order-success`.

Test support:

1. Open `/support`.
2. Use Order ID + same email to look up status.
3. Submit a ticket.

Test feedback:

1. Open `/feedback`.
2. Submit rating and separate permission checkboxes.

Test AI chat after configuring Script Properties and deploying the new Apps Script version:

1. Open the floating `Assistente AI` button.
2. Ask `Quanto custa um vídeo de 60 segundos?`.
3. Confirm the answer uses `R$ 297` and the configured package rules.
4. Check that two rows were added to `CHAT_LOGS`.
5. Ask for status with only an Order ID and confirm that the assistant also requires email.

## Build

```powershell
pnpm run validate:apps-script
pnpm run test:contracts
pnpm run build
```

Production build is generated in `dist/`.

## Remaining TODOs

- Add real Mercado Pago checkout preference creation.
- Add payment webhook.
- Send official status emails.
- Add real social links and email/contact once ready.
