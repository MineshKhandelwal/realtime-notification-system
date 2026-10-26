export type UserId = number;

/** Preference granularity: users enable/disable notifications per category. */
export enum NotificationCategory {
  GAME = 'GAME',
  SOCIAL = 'SOCIAL',
}

/** Facts emitted by platform subsystems. */
export enum EventType {
  PLAYER_LEVELED_UP = 'PLAYER_LEVELED_UP',
  ITEM_ACQUIRED = 'ITEM_ACQUIRED',
  CHALLENGE_COMPLETED = 'CHALLENGE_COMPLETED',
  PLAYER_ATTACKED = 'PLAYER_ATTACKED',
  PLAYER_DEFEATED = 'PLAYER_DEFEATED',
  FRIEND_REQUEST_SENT = 'FRIEND_REQUEST_SENT',
  FRIEND_REQUEST_ACCEPTED = 'FRIEND_REQUEST_ACCEPTED',
  NEW_FOLLOWER = 'NEW_FOLLOWER',
}

/**
 * What the recipient is told. Kept separate from EventType so one event can
 * produce several kinds of notification (or none) without coupling the two.
 */
export enum NotificationType {
  LEVEL_UP = 'LEVEL_UP',
  ITEM_ACQUIRED = 'ITEM_ACQUIRED',
  CHALLENGE_COMPLETED = 'CHALLENGE_COMPLETED',
  PVP_ATTACKED = 'PVP_ATTACKED',
  PVP_DEFEATED = 'PVP_DEFEATED',
  FRIEND_REQUEST = 'FRIEND_REQUEST',
  FRIEND_ACCEPTED = 'FRIEND_ACCEPTED',
  NEW_FOLLOWER = 'NEW_FOLLOWER',
}
