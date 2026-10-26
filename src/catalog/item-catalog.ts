export enum Rarity {
  COMMON = 'COMMON',
  UNCOMMON = 'UNCOMMON',
  RARE = 'RARE',
  EPIC = 'EPIC',
  LEGENDARY = 'LEGENDARY',
}

const RARITY_ORDER: readonly Rarity[] = [Rarity.COMMON, Rarity.UNCOMMON, Rarity.RARE, Rarity.EPIC, Rarity.LEGENDARY];

export function isAtLeast(rarity: Rarity, threshold: Rarity): boolean {
  return RARITY_ORDER.indexOf(rarity) >= RARITY_ORDER.indexOf(threshold);
}

export interface ItemInfo {
  readonly displayName: string;
  readonly rarity: Rarity;
}

export interface ItemCatalog {
  lookup(itemId: string): ItemInfo | undefined;
}

export class InMemoryItemCatalog implements ItemCatalog {
  private readonly items: ReadonlyMap<string, ItemInfo>;

  constructor(items: Record<string, ItemInfo>) {
    this.items = new Map(Object.entries(items));
  }

  lookup(itemId: string): ItemInfo | undefined {
    return this.items.get(itemId);
  }
}

export const DEFAULT_ITEMS: Readonly<Record<string, ItemInfo>> = {
  SwordOfAzeroth: { displayName: 'Sword of Azeroth', rarity: Rarity.LEGENDARY },
  DragonScaleArmor: { displayName: 'Dragon Scale Armor', rarity: Rarity.EPIC },
  PhoenixFeather: { displayName: 'Phoenix Feather', rarity: Rarity.RARE },
  ElvenBow: { displayName: 'Elven Bow', rarity: Rarity.UNCOMMON },
  RustyDagger: { displayName: 'Rusty Dagger', rarity: Rarity.COMMON },
};

const MINOR_WORDS = new Set(['a', 'an', 'and', 'the', 'of', 'in', 'on', 'to', 'for']);

/** Fallback display name for items missing from the catalog: `SwordOfAzeroth` → `Sword of Azeroth`. */
export function humanizeItemId(itemId: string): string {
  return itemId
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .trim()
    .split(/\s+/)
    .map((word, index) => {
      const lower = word.toLowerCase();
      if (index > 0 && MINOR_WORDS.has(lower)) return lower;
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}
