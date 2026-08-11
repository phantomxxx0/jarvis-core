import { BrainEvent } from '../contracts/brain-event';
import { BrainEventResponse } from '../contracts/brain-event-response';
import { IBrainEventHandler } from './brain-event-handler.interface';
import { BrainEventType } from '../enums/brain-event-type.enum';

export interface IBrainEventPublisher {
  publish<TEvent extends BrainEvent, TResult = unknown>(
    event: TEvent,
  ): Promise<BrainEventResponse<TResult> | void>;
}

export interface IBrainEventSubscriber {
  subscribe<TEvent extends BrainEvent, TResult = unknown>(
    type: BrainEventType,
    handler: IBrainEventHandler<TEvent, TResult>,
  ): void;

  unsubscribe<TEvent extends BrainEvent, TResult = unknown>(
    type: BrainEventType,
    handler: IBrainEventHandler<TEvent, TResult>,
  ): void;
}

export interface IBrainEventBus
  extends IBrainEventPublisher, IBrainEventSubscriber {}
