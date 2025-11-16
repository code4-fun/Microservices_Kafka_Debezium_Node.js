import { Topics } from './topics';

export interface OrderCancelledEvent {
  topic: Topics.OrderCancelled;
  data: {
    id: string;
    ticket: {
      id: string;
    };
    version: number;
  };
}
