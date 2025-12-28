export enum DLQTopics {
  TicketCreatedDLQ = 'tickets.ticket.created.v1.DLQ',
  TicketUpdatedDLQ = 'tickets.ticket.updated.v1.DLQ',

  OrderCreatedDLQ = 'orders.order.created.v1.DLQ',
  OrderCancelledDLQ = 'orders.order.cancelled.v1.DLQ',

  ExpirationCompleteDLQ = 'expiration.expiration.complete.v1.DLQ',

  PaymentCreatedDLQ = 'payments.payment.created.v1.DLQ',
}
