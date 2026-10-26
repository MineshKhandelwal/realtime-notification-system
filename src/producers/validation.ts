import { InvalidEventError } from '../domain/errors';
import { UserId } from '../domain/types';

// Producers may be called from plain JS, so values are checked at runtime, not just by the compiler.

function describe(value: unknown): string {
  return typeof value === 'string' ? `"${value}"` : String(value);
}

export function assertPositiveInteger(value: unknown, field: string): asserts value is number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value <= 0) {
    throw new InvalidEventError(`${field} must be a positive integer, got ${describe(value)}`);
  }
}

export function assertUserId(value: unknown, field: string): asserts value is UserId {
  assertPositiveInteger(value, field);
}

/** Returns the trimmed string. */
export function requireNonEmptyString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new InvalidEventError(`${field} must be a non-empty string, got ${describe(value)}`);
  }
  return value.trim();
}

export function assertDifferentPlayers(actorId: UserId, targetId: UserId, action: string): void {
  if (actorId === targetId) {
    throw new InvalidEventError(`Player ${actorId} cannot ${action} themselves`);
  }
}
