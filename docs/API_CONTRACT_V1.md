# API Contract v1

The frontend and Google Apps Script communicate through one `POST` endpoint. The endpoint URL is configured through `VITE_APPS_SCRIPT_ENDPOINT` and is never hardcoded in a component.

## Request envelope

```json
{
  "version": "v1",
  "action": "create_order",
  "requestId": "de305d54-75b4-431b-adb2-eb6b9e546014",
  "sentAt": "2026-08-25T16:00:00.000Z",
  "payload": {}
}
```

`requestId` identifies a delivery attempt. Entity actions are also idempotent by their own IDs: `Order_ID`, `Ticket_ID` and `Feedback_ID`.

## Success response

```json
{
  "ok": true,
  "version": "v1",
  "requestId": "de305d54-75b4-431b-adb2-eb6b9e546014",
  "data": {
    "orderId": "ORD-2026-1001",
    "created": true
  }
}
```

## Error response

```json
{
  "ok": false,
  "version": "v1",
  "requestId": "de305d54-75b4-431b-adb2-eb6b9e546014",
  "error": {
    "code": "INVALID_EMAIL",
    "message": "Email inválido.",
    "field": "order.email",
    "retryable": false
  }
}
```

## Implemented actions

- `health`: reports service version and whether the spreadsheet is configured.
- `create_brief`: writes a standalone brief to `BRIEFS`.
- `generate_roteiro`: validates the written brief and generates a duration-aware VO preview through the configured LLM.
- `create_order`: upserts `ORDERS` and its matching `BRIEFS` row.
- `create_payment`: creates a Mercado Pago Checkout Pro preference for an existing `PAYMENT_PENDING` order and returns the hosted checkout link.
- `payment_webhook`: receives Mercado Pago notifications, fetches the payment from Mercado Pago, verifies the Order ID and amount, then updates `PAYMENTS` and `ORDERS`.
- `lookup_order`: returns a safe status subset only when Order ID and email match.
- `create_ticket`: validates order ownership and upserts `TICKETS`.
- `create_feedback`: validates order ownership, writes `FEEDBACK` and updates independent portfolio/testimonial permissions in `ORDERS`.
- `chat`: answers from the Markdown knowledge base and logs user/assistant messages to `CHAT_LOGS`.
- `log_chat`: stores a validated individual chat message.
- `log_event`: appends a structured event to `EVENTS`.
- `send_email`: protected utility for order-owned email notifications.

## AI payloads

`generate_roteiro` accepts the same `BriefFormData` used by the frontend:

```json
{
  "action": "generate_roteiro",
  "payload": { "brief": {} }
}
```

`chat` accepts the current message, a browser-generated session ID, up to eight recent messages and limited page context:

```json
{
  "action": "chat",
  "payload": {
    "message": "Qual duração combina com meu vídeo?",
    "sessionId": "CHAT-...",
    "history": [{ "role": "user", "content": "..." }],
    "pageContext": { "path": "/", "title": "Whiteboard para Negócios" }
  }
}
```

Order status is never inferred by the LLM. When a chat message contains both Order ID and email, Apps Script reads the matching `ORDERS` record directly. With only one identifier, it asks for the missing value.

## Privacy and validation

- Order lookup always requires Order ID and the original email.
- Ticket and feedback creation require the same Order ID/email pair.
- Input lengths and emails are validated server-side.
- Package price, monthly discount, second-format fee, express fee and due date are recalculated by Apps Script. Frontend totals are not trusted.
- Cell values beginning with `=`, `+`, `-` or `@` are escaped before writing to Sheets.
- Feedback permission for a testimonial is stored separately from permission to show the client video.
- LLM keys, Mercado Pago access tokens and the Google Sheets ID do not belong in frontend variables.
- AI credentials are read only from Apps Script Properties.
- Mercado Pago credentials are read only from Apps Script Properties. The frontend receives only the hosted checkout link, never the access token.
- The public MVP does not fetch PDFs, Google Drive files or external websites. All source facts must be pasted into the written brief and approved before checkout.

## Mercado Pago

`create_payment` payload:

```json
{
  "orderId": "ORD-2026-1001",
  "method": "PIX",
  "returnBaseUrl": "https://your-domain.com"
}
```

Success response:

```json
{
  "orderId": "ORD-2026-1001",
  "checkoutLink": "https://www.mercadopago.com.br/checkout/...",
  "preferenceId": "123456",
  "paymentStatus": "PAYMENT_PENDING"
}
```

Mercado Pago sends webhook notifications to the deployed Apps Script URL with `?webhook=mercadopago`.
The webhook payload is not trusted as final payment proof. Apps Script fetches the payment by ID from Mercado Pago and verifies:

- `external_reference` matches an existing `Order_ID`;
- confirmed amount matches the server-calculated `ORDERS.Price`;
- provider status maps to `PAID`, `FAILED`, `CANCELLED`, `REFUNDED` or `PAYMENT_PENDING`.

Pricing rules currently exist in both `src/content.ts` for presentation and `apps-script/Config.gs` as the server source of truth. Update both files when a price changes; the server value is authoritative.
