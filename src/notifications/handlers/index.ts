import { ItemCatalog } from '../../catalog/item-catalog';
import { Logger } from '../../infra/logger';
import { PlayerNameResolver } from '../../players/player-name-resolver';
import { EventHandler } from '../event-handler';
import {
  ChallengeCompletedHandler,
  ItemAcquiredHandler,
  LevelUpHandler,
  PlayerAttackedHandler,
  PlayerDefeatedHandler,
} from './game-handlers';
import { FriendRequestAcceptedHandler, FriendRequestSentHandler, NewFollowerHandler } from './social-handlers';

export * from './game-handlers';
export * from './social-handlers';

export interface HandlerDependencies {
  itemCatalog: ItemCatalog;
  playerNames: PlayerNameResolver;
  logger: Logger;
}

export function createDefaultHandlers({ itemCatalog, playerNames, logger }: HandlerDependencies): EventHandler[] {
  return [
    new LevelUpHandler(),
    new ItemAcquiredHandler(itemCatalog, logger),
    new ChallengeCompletedHandler(),
    new PlayerAttackedHandler(playerNames),
    new PlayerDefeatedHandler(playerNames),
    new FriendRequestSentHandler(playerNames),
    new FriendRequestAcceptedHandler(playerNames),
    new NewFollowerHandler(playerNames),
  ];
}
