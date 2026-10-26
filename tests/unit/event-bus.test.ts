import { EventType } from '../../src/domain/types';
import { InMemoryEventBus } from '../../src/events/event-bus';
import { Logger, silentLogger } from '../../src/infra/logger';
import { makeEvent } from '../helpers';

const event = () => makeEvent(EventType.PLAYER_LEVELED_UP, { userId: 1, level: 2 });

describe('InMemoryEventBus', () => {
  it('delivers each event to every subscriber and aggregates their results', async () => {
    const bus = new InMemoryEventBus<string>(silentLogger);
    bus.subscribe(() => ['a']);
    bus.subscribe(async () => ['b', 'c']);
    await expect(bus.publish(event())).resolves.toEqual(['a', 'b', 'c']);
  });

  it('isolates a failing listener: others still run, publish does not reject, error is logged', async () => {
    const logger: Logger = { ...silentLogger, error: jest.fn() };
    const bus = new InMemoryEventBus<string>(logger);
    bus.subscribe(() => {
      throw new Error('boom');
    });
    bus.subscribe(async () => Promise.reject(new Error('async boom')));
    bus.subscribe(() => ['ok']);

    await expect(bus.publish(event())).resolves.toEqual(['ok']);
    expect(logger.error).toHaveBeenCalledTimes(2);
  });

  it('stops delivering after unsubscribe', async () => {
    const bus = new InMemoryEventBus<string>(silentLogger);
    const listener = jest.fn(() => ['x']);
    const unsubscribe = bus.subscribe(listener);
    unsubscribe();
    await expect(bus.publish(event())).resolves.toEqual([]);
    expect(listener).not.toHaveBeenCalled();
  });

  it('resolves with no results when nobody is subscribed', async () => {
    await expect(new InMemoryEventBus<string>(silentLogger).publish(event())).resolves.toEqual([]);
  });
});
