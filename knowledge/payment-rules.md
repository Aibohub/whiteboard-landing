# Payment Rules

Provider: Mercado Pago.
Methods: PIX and card.
Payment token must never be exposed in frontend.
Order ID is created before payment with PAYMENT_PENDING.
The frontend receives only a hosted Mercado Pago checkout link.
Payment is confirmed only after the backend verifies the Mercado Pago payment by ID.
For monthly plans, the remaining VOs are generated only after confirmed payment.

Statuses:
- PAYMENT_PENDING
- PAID
- FAILED
- CANCELLED
- REFUNDED
