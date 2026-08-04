import { EventEnvelope } from './event-envelope.interface';

export interface IObservationSynchronizer {
  getName(): string;
  synchronize(event: EventEnvelope): Promise<void>;
}
