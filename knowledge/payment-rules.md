# Payment Rules

Provider: Mercado Pago.
Methods: PIX and card.
Payment token must never be exposed in frontend.
Order ID is created before payment with PAYMENT_PENDING.

Statuses:
- PAYMENT_PENDING
- PAID
- FAILED
- CANCELLED
- REFUNDED
