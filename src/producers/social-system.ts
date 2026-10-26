import { EventType, UserId } from '../domain/types';
import { DispatchResult } from '../notifications/dispatch-result';
import { EventPublisher } from './event-publisher';
import { assertDifferentPlayers, assertUserId } from './validation';

/** Simulated social system. Same contract as GameEngine: validate, publish, never reject. */
export class SocialSystem {
  constructor(private readonly publisher: EventPublisher) {}

  friendRequestSent(senderId: UserId, recipientId: UserId): Promise<DispatchResult[]> {
    assertUserId(senderId, 'senderId');
    assertUserId(recipientId, 'recipientId');
    assertDifferentPlayers(senderId, recipientId, 'send a friend request to');
    return this.publisher.publish(EventType.FRIEND_REQUEST_SENT, { senderId, recipientId });
  }

  /** `accepterId` accepted the friend request previously sent by `requesterId`. */
  friendRequestAccepted(accepterId: UserId, requesterId: UserId): Promise<DispatchResult[]> {
    assertUserId(accepterId, 'accepterId');
    assertUserId(requesterId, 'requesterId');
    assertDifferentPlayers(accepterId, requesterId, 'accept a friend request from');
    return this.publisher.publish(EventType.FRIEND_REQUEST_ACCEPTED, { accepterId, requesterId });
  }

  newFollower(followerId: UserId, followedId: UserId): Promise<DispatchResult[]> {
    assertUserId(followerId, 'followerId');
    assertUserId(followedId, 'followedId');
    assertDifferentPlayers(followerId, followedId, 'follow');
    return this.publisher.publish(EventType.NEW_FOLLOWER, { followerId, followedId });
  }
}
