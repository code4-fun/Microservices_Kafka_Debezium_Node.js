import { TicketCreatedEvent } from '../ticket-created-event';
import { TicketUpdatedEvent } from '../ticket-updated-event';
import { OrderCreatedEvent } from '../order-created-event';
import { OrderCancelledEvent } from '../order-cancelled-event';
import { ExpirationCompleteEvent } from '../expiration-complete-event';
import { PaymentCreatedEvent } from '../payment-created-event';

export interface EventMap {
  TicketCreated: TicketCreatedEvent;
  TicketUpdated: TicketUpdatedEvent;
  OrderCreated: OrderCreatedEvent;
  OrderCancelled: OrderCancelledEvent;
  ExpirationComplete: ExpirationCompleteEvent;
  PaymentCreated: PaymentCreatedEvent;
}
