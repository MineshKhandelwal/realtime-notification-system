import { DomainEvent } from '../domain/events';
import { errorMessage } from '../domain/errors';
import { Logger } from '../infra/logger';

export type EventListener<R> = (event: DomainEvent) => R[] | Promise<R[]>;

/** Decouples producers from consumers. `publish` resolves with every listener's results and never rejects. */
export interface EventBus<R> {
  publish(event: DomainEvent): Promise<R[]>;
  /** Returns an unsubscribe function. */
  subscribe(listener: EventListener<R>): () => void;
}

export class InMemoryEventBus<R> implements EventBus<R> {
  private readonly listeners = new Set<EventListener<R>>();

  constructor(private readonly logger: Logger) {}

  subscribe(listener: EventListener<R>): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  async publish(event: DomainEvent): Promise<R[]> {
    const results: R[] = [];
    // Sequential so events are handled in publish order; one failing listener must not affect the others.
    for (const listener of [...this.listeners]) {
      try {
        results.push(...(await listener(event)));
      } catch (error) {
        this.logger.error('Event listener failed', {
          eventId: event.eventId,
          eventType: event.type,
          error: errorMessage(error),
        });
      }
    }
    return results;
  }
}
