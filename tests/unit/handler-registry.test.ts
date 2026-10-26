import { DEFAULT_ITEMS, InMemoryItemCatalog } from '../../src/catalog/item-catalog';
import { EventType } from '../../src/domain/types';
import { silentLogger } from '../../src/infra/logger';
import { HandlerRegistry } from '../../src/notifications/handler-registry';
import { createDefaultHandlers, LevelUpHandler } from '../../src/notifications/handlers';
import { IdPlayerNameResolver } from '../../src/players/player-name-resolver';

describe('HandlerRegistry', () => {
  it('returns the handler registered for a type, and undefined otherwise', () => {
    const handler = new LevelUpHandler();
    const registry = new HandlerRegistry().register(handler);
    expect(registry.get(EventType.PLAYER_LEVELED_UP)).toBe(handler);
    expect(registry.get(EventType.NEW_FOLLOWER)).toBeUndefined();
  });

  it('rejects a second handler for the same event type', () => {
    const registry = new HandlerRegistry().register(new LevelUpHandler());
    expect(() => registry.register(new LevelUpHandler())).toThrow(/already registered for PLAYER_LEVELED_UP/);
  });

  it('default handlers cover every EventType exactly once', () => {
    const registry = new HandlerRegistry();
    createDefaultHandlers({
      itemCatalog: new InMemoryItemCatalog(DEFAULT_ITEMS),
      playerNames: new IdPlayerNameResolver(),
      logger: silentLogger,
    }).forEach((h) => registry.register(h));

    expect(registry.registeredTypes().sort()).toEqual(Object.values(EventType).sort());
  });
});
