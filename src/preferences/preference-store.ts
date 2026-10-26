import { NotificationCategory, UserId } from '../domain/types';

export interface PreferenceStore {
  isEnabled(userId: UserId, category: NotificationCategory): boolean;
  setPreference(userId: UserId, category: NotificationCategory, enabled: boolean): void;
}

/** Per-user map of category → enabled. Anything not set falls back to `defaultEnabled` (opt-out model). */
export class InMemoryPreferenceStore implements PreferenceStore {
  private readonly preferences = new Map<UserId, Map<NotificationCategory, boolean>>();

  constructor(private readonly defaultEnabled = true) {}

  isEnabled(userId: UserId, category: NotificationCategory): boolean {
    return this.preferences.get(userId)?.get(category) ?? this.defaultEnabled;
  }

  setPreference(userId: UserId, category: NotificationCategory, enabled: boolean): void {
    let userPreferences = this.preferences.get(userId);
    if (!userPreferences) {
      userPreferences = new Map();
      this.preferences.set(userId, userPreferences);
    }
    userPreferences.set(category, enabled);
  }
}
