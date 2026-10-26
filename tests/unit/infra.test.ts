import { createNotificationSystem } from '../../src/container';
import { systemClock } from '../../src/infra/clock';
import { uuidGenerator } from '../../src/infra/id-generator';
import { createConsoleLogger } from '../../src/infra/logger';

describe('createConsoleLogger', () => {
  let log: jest.SpyInstance, warn: jest.SpyInstance, error: jest.SpyInstance;
  beforeEach(() => {
    log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    error = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });
  afterEach(() => jest.restoreAllMocks());

  it('drops messages below the minimum level and routes the rest by severity', () => {
    const logger = createConsoleLogger('info');
    logger.debug('hidden');
    logger.info('hello', { a: 1 });
    logger.warn('careful');
    logger.error('broken');
    expect(log).toHaveBeenCalledTimes(1);
    expect(log).toHaveBeenCalledWith('[INFO] hello {"a":1}');
    expect(warn).toHaveBeenCalledWith('[WARN] careful');
    expect(error).toHaveBeenCalledWith('[ERROR] broken');
  });
});

describe('defaults', () => {
  afterEach(() => jest.restoreAllMocks());

  it('systemClock and uuidGenerator produce fresh values', () => {
    expect(systemClock.now()).toBeInstanceOf(Date);
    expect(uuidGenerator.next()).toMatch(/^[0-9a-f-]{36}$/);
    expect(uuidGenerator.next()).not.toBe(uuidGenerator.next());
  });

  it('createNotificationSystem() works with no overrides', async () => {
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    const { gameEngine } = createNotificationSystem();
    await expect(gameEngine.playerLeveledUp(1, 15)).resolves.toEqual([
      expect.objectContaining({ status: 'SENT', recipientId: 1 }),
    ]);
  });
});
