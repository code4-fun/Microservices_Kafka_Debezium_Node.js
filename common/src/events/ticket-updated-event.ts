import { Topics } from './topics';

export interface TicketUpdatedEvent {
  topic: Topics.TicketUpdated;
  data: {
    id: string;
    title: string;
    price: number;
    userId: string;
    orderId?: string;
    version: number;
  };
}
