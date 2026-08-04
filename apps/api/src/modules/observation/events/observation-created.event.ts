import { userObservations } from '@jarvis/database';
import { InferSelectModel } from 'drizzle-orm';

export class ObservationCreatedEvent {
  public static readonly EVENT_NAME = 'observation.created';

  constructor(
    public readonly observation: InferSelectModel<typeof userObservations>,
  ) {}
}
