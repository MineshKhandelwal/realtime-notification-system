import { EventType, UserId } from './types';

interface BaseEvent<T extends EventType, P> {
  readonly eventId: string;
  readonly type: T;
  readonly occurredAt: Date;
  readonly payload: Readonly<P>;
}

export type PlayerLeveledUpEvent = BaseEvent<EventType.PLAYER_LEVELED_UP, { userId: UserId; level: number }>;
export type ItemAcquiredEvent = BaseEvent<EventType.ITEM_ACQUIRED, { userId: UserId; itemId: string }>;
export type ChallengeCompletedEvent = BaseEvent<
  EventType.CHALLENGE_COMPLETED,
  { userId: UserId; challengeName: string }
>;
export type PlayerAttackedEvent = BaseEvent<EventType.PLAYER_ATTACKED, { attackerId: UserId; victimId: UserId }>;
export type PlayerDefeatedEvent = BaseEvent<EventType.PLAYER_DEFEATED, { winnerId: UserId; loserId: UserId }>;
export type FriendRequestSentEvent = BaseEvent<
  EventType.FRIEND_REQUEST_SENT,
  { senderId: UserId; recipientId: UserId }
>;
export type FriendRequestAcceptedEvent = BaseEvent<
  EventType.FRIEND_REQUEST_ACCEPTED,
  { accepterId: UserId; requesterId: UserId }
>;
export type NewFollowerEvent = BaseEvent<EventType.NEW_FOLLOWER, { followerId: UserId; followedId: UserId }>;

export type DomainEvent =
  | PlayerLeveledUpEvent
  | ItemAcquiredEvent
  | ChallengeCompletedEvent
  | PlayerAttackedEvent
  | PlayerDefeatedEvent
  | FriendRequestSentEvent
  | FriendRequestAcceptedEvent
  | NewFollowerEvent;

export type EventOfType<T extends EventType> = Extract<DomainEvent, { type: T }>;
export type PayloadOf<T extends EventType> = EventOfType<T>['payload'];
