import { BrainEvent } from '../contracts/brain-event';
import { BrainEventResponse } from '../contracts/brain-event-response';

export interface IBrainEventHandler<
  TEvent extends BrainEvent = BrainEvent,
  TResult = unknown,
> {
  handle(event: TEvent): Promise<BrainEventResponse<TResult>>;
}
