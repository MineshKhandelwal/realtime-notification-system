import { Notification } from '../../src/domain/notification';
import { NotificationCategory, NotificationType } from '../../src/domain/types';
import { FIXED_DATE } from '../helpers';

describe('Notification', () => {
  const props = {
    id: 'ntf-1',
    recipientId: 1,
    type: NotificationType.LEVEL_UP,
    category: NotificationCategory.GAME,
    message: "Congratulations! You've reached level 15!",
    createdAt: FIXED_DATE,
    metadata: { level: 15 },
  };

  it('stores all fields', () => {
    const n = new Notification(props);
    expect(n).toMatchObject({ ...props, createdAt: FIXED_DATE });
  });

  it('is immutable, including metadata', () => {
    const n = new Notification(props);
    expect(() => {
      (n as { message: string }).message = 'changed';
    }).toThrow(TypeError);
    expect(Object.isFrozen(n.metadata)).toBe(true);
  });

  it('does not share the caller’s Date or metadata instances', () => {
    const createdAt = new Date(FIXED_DATE);
    const metadata = { level: 15 };
    const n = new Notification({ ...props, createdAt, metadata });
    createdAt.setFullYear(2000);
    metadata.level = 99;
    expect(n.createdAt).toEqual(FIXED_DATE);
    expect(n.metadata).toEqual({ level: 15 });
  });

  it('defaults metadata to an empty object', () => {
    const { metadata: _ignored, ...rest } = props;
    expect(new Notification(rest).metadata).toEqual({});
  });
});
