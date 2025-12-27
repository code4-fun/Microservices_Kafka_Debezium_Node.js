import { Listener } from './base-listener';
import { Topics } from './topics';

interface Event {
  topic: Topics;
  data: any;
}

export abstract class RawListener<T extends Event> extends Listener<T> {
  protected async decode(value: Buffer): Promise<any> {
    return JSON.parse(value.toString('utf-8'));
  }
}
