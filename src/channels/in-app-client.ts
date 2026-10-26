import { UserId } from '../domain/types';

/** Wire format expected by the (external, pre-existing) in-app notification client. */
export interface InAppPayload {
  notificationId: string;
  type: string;
  category: string;
  message: string;
  createdAt: string;
}

/** The existing game-client delivery mechanism. Out of scope per the brief, so only mocked here. */
export interface InAppClient {
  push(userId: UserId, payload: InAppPayload): Promise<void>;
}

export interface Delivery {
  userId: UserId;
  payload: InAppPayload;
}

/** Simulated client: records every delivery and optionally reports it (the demo prints them). */
export class MockInAppClient implements InAppClient {
  readonly deliveries: Delivery[] = [];

  constructor(private readonly onPush?: (delivery: Delivery) => void) {}

  async push(userId: UserId, payload: InAppPayload): Promise<void> {
    const delivery = { userId, payload };
    this.deliveries.push(delivery);
    this.onPush?.(delivery);
  }

  deliveriesFor(userId: UserId): Delivery[] {
    return this.deliveries.filter((delivery) => delivery.userId === userId);
  }
}
