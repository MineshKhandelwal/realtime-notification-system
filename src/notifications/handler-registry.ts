import { EventType } from '../domain/types';
import { EventHandler } from './event-handler';

export class HandlerRegistry {
  private readonly handlers = new Map<EventType, EventHandler>();

  register(handler: EventHandler): this {
    if (this.handlers.has(handler.eventType)) {
      throw new Error(`A handler is already registered for ${handler.eventType}`);
    }
    this.handlers.set(handler.eventType, handler);
    return this;
  }

  get<T extends EventType>(type: T): EventHandler<T> | undefined {
    // Safe: register() keys every handler by its own eventType.
    return this.handlers.get(type) as EventHandler<T> | undefined;
  }

  registeredTypes(): EventType[] {
    return [...this.handlers.keys()];
  }
}
