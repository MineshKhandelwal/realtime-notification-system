import { UserId } from '../domain/types';

/**
 * Seam for showing player names in messages. Handlers depend only on this
 * interface, so a real profile service can replace the default without
 * touching notification logic. Implementations must always return a name,
 * falling back to the player ID when the player is unknown.
 */
export interface PlayerNameResolver {
  displayName(userId: UserId): string;
}

/** Default: no profile service exists, so the player ID is the display name. */
export class IdPlayerNameResolver implements PlayerNameResolver {
  displayName(userId: UserId): string {
    return String(userId);
  }
}
