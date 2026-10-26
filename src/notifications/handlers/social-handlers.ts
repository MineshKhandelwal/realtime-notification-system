import { FriendRequestAcceptedEvent, FriendRequestSentEvent, NewFollowerEvent } from '../../domain/events';
import { EventType, NotificationCategory, NotificationType } from '../../domain/types';
import { PlayerNameResolver } from '../../players/player-name-resolver';
import { EventHandler } from '../event-handler';
import { NotificationIntent } from '../notification-intent';

export class FriendRequestSentHandler implements EventHandler<EventType.FRIEND_REQUEST_SENT> {
  readonly eventType = EventType.FRIEND_REQUEST_SENT;

  constructor(private readonly playerNames: PlayerNameResolver) {}

  handle({ payload }: FriendRequestSentEvent): NotificationIntent[] {
    return [
      {
        recipientId: payload.recipientId,
        type: NotificationType.FRIEND_REQUEST,
        category: NotificationCategory.SOCIAL,
        message: `Player '${this.playerNames.displayName(payload.senderId)}' has sent you a friend request.`,
        metadata: { senderId: payload.senderId },
      },
    ];
  }
}

/** Only the original requester is notified; the accepter performed the action. */
export class FriendRequestAcceptedHandler implements EventHandler<EventType.FRIEND_REQUEST_ACCEPTED> {
  readonly eventType = EventType.FRIEND_REQUEST_ACCEPTED;

  constructor(private readonly playerNames: PlayerNameResolver) {}

  handle({ payload }: FriendRequestAcceptedEvent): NotificationIntent[] {
    return [
      {
        recipientId: payload.requesterId,
        type: NotificationType.FRIEND_ACCEPTED,
        category: NotificationCategory.SOCIAL,
        message: `Player '${this.playerNames.displayName(payload.accepterId)}' accepted your friend request.`,
        metadata: { accepterId: payload.accepterId },
      },
    ];
  }
}

export class NewFollowerHandler implements EventHandler<EventType.NEW_FOLLOWER> {
  readonly eventType = EventType.NEW_FOLLOWER;

  constructor(private readonly playerNames: PlayerNameResolver) {}

  handle({ payload }: NewFollowerEvent): NotificationIntent[] {
    return [
      {
        recipientId: payload.followedId,
        type: NotificationType.NEW_FOLLOWER,
        category: NotificationCategory.SOCIAL,
        message: `Player '${this.playerNames.displayName(payload.followerId)}' started following you.`,
        metadata: { followerId: payload.followerId },
      },
    ];
  }
}
