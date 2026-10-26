import { EventOfType, PayloadOf } from '../domain/events';
import { EventType } from '../domain/types';
import { EventBus } from '../events/event-bus';
import { Clock } from '../infra/clock';
import { IdGenerator } from '../infra/id-generator';
import { DispatchResult } from '../notifications/dispatch-result';

export interface ProducerDependencies {
  bus: EventBus<DispatchResult>;
  clock: Clock;
  eventIds: IdGenerator;
}

/** Stamps an ID and timestamp on a payload and publishes it. Shared by all producers. */
export class EventPublisher {
  constructor(private readonly deps: ProducerDependencies) {}

  publish<T extends EventType>(type: T, payload: PayloadOf<T>): Promise<DispatchResult[]> {
    // TS can't correlate `type` and `payload` through the generic; the signature guarantees they match.
    const event = {
      eventId: this.deps.eventIds.next(),
      type,
      occurredAt: this.deps.clock.now(),
      payload: Object.freeze({ ...payload }),
    } as unknown as EventOfType<T>;
    return this.deps.bus.publish(event);
  }
}
