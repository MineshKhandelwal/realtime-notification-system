import {
  DEFAULT_ITEMS,
  humanizeItemId,
  InMemoryItemCatalog,
  isAtLeast,
  Rarity,
} from '../../src/catalog/item-catalog';

describe('InMemoryItemCatalog', () => {
  const catalog = new InMemoryItemCatalog(DEFAULT_ITEMS);

  it('finds known items by exact ID', () => {
    expect(catalog.lookup('SwordOfAzeroth')).toEqual({ displayName: 'Sword of Azeroth', rarity: Rarity.LEGENDARY });
  });

  it('returns undefined for unknown items (lookup is case-sensitive)', () => {
    expect(catalog.lookup('MoonlitAmulet')).toBeUndefined();
    expect(catalog.lookup('swordofazeroth')).toBeUndefined();
  });
});

describe('isAtLeast', () => {
  it.each([
    [Rarity.LEGENDARY, Rarity.RARE, true],
    [Rarity.RARE, Rarity.RARE, true],
    [Rarity.UNCOMMON, Rarity.RARE, false],
    [Rarity.COMMON, Rarity.RARE, false],
  ])('%s ≥ %s → %s', (rarity, threshold, expected) => {
    expect(isAtLeast(rarity, threshold)).toBe(expected);
  });
});

describe('humanizeItemId', () => {
  it.each([
    ['SwordOfAzeroth', 'Sword of Azeroth'],
    ['MoonlitAmulet', 'Moonlit Amulet'],
    ['dragon_scale-armor', 'Dragon Scale Armor'],
    ['TheEyeOfTheStorm', 'The Eye of the Storm'],
    ['Excalibur', 'Excalibur'],
    ['Potion2X', 'Potion2 X'],
  ])('%s → %s', (input, expected) => {
    expect(humanizeItemId(input)).toBe(expected);
  });
});
