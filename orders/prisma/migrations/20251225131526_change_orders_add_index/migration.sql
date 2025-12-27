CREATE UNIQUE INDEX unique_active_order_per_ticket
ON "Order" ("ticketId")
WHERE status IN ('created', 'awaiting_payment');
