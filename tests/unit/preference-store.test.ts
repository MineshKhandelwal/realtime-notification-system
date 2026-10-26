import { NotificationCategory } from '../../src/domain/types';
import { InMemoryPreferenceStore } from '../../src/preferences/preference-store';

const { GAME, SOCIAL } = NotificationCategory;

describe('InMemoryPreferenceStore', () => {
  it('treats users with no stored preferences as enabled for every category', () => {
    const store = new InMemoryPreferenceStore();
    expect(store.isEnabled(42, GAME)).toBe(true);
    expect(store.isEnabled(42, SOCIAL)).toBe(true);
  });

  it('keeps categories independent', () => {
    const store = new InMemoryPreferenceStore();
    store.setPreference(1, SOCIAL, false);
    expect(store.isEnabled(1, SOCIAL)).toBe(false);
    expect(store.isEnabled(1, GAME)).toBe(true);
  });

  it('keeps users independent', () => {
    const store = new InMemoryPreferenceStore();
    store.setPreference(1, GAME, false);
    expect(store.isEnabled(2, GAME)).toBe(true);
  });

  it('lets a later setting overwrite an earlier one', () => {
    const store = new InMemoryPreferenceStore();
    store.setPreference(1, GAME, false);
    store.setPreference(1, GAME, true);
    expect(store.isEnabled(1, GAME)).toBe(true);
  });

  it('supports an opt-in default', () => {
    const store = new InMemoryPreferenceStore(false);
    expect(store.isEnabled(1, GAME)).toBe(false);
    store.setPreference(1, GAME, true);
    expect(store.isEnabled(1, GAME)).toBe(true);
  });
});
