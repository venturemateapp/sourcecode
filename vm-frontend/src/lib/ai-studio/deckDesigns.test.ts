import { describe, expect, it } from 'vitest';
import { DECK_DESIGNS, DECK_HEIGHT, DECK_WIDTH, getDeckDesign, isCoveredBackground } from './deckDesigns';
import type { DeckDocument, DeckElement } from './types';

describe('deck backgrounds', () => {
  it('resolves a saved selection and leaves existing or unknown designs alone', () => {
    const document = { metadata: { backgroundDesign: 'ocean' } } as unknown as DeckDocument;
    expect(getDeckDesign(document)?.name).toBe('Sky');
    document.metadata = { backgroundDesign: 'original' };
    expect(getDeckDesign(document)).toBeUndefined();
    document.metadata = undefined;
    expect(getDeckDesign(document)).toBeUndefined();
  });

  it('only covers full-slide background shapes while a design is active', () => {
    const background = { type: 'shape', x: 0, y: 0, w: 13.333, h: 7.5 } as DeckElement;
    expect(isCoveredBackground(background, DECK_DESIGNS[0])).toBe(true);
    expect(isCoveredBackground(background)).toBe(false);
    expect(isCoveredBackground({ ...background, w: 4 }, DECK_DESIGNS[0])).toBe(false);
    expect(isCoveredBackground({ ...background, type: 'image' }, DECK_DESIGNS[0])).toBe(false);
  });

  it('keeps all design artwork within the exported slide', () => {
    expect(DECK_DESIGNS.every(design => design.background === '#ffffff')).toBe(true);
    expect(DECK_DESIGNS.every(design => {
      const [red, green, blue] = design.text.replace('#', '').match(/.{2}/g)?.map(channel => parseInt(channel, 16)) || [];
      return (.2126 * red + .7152 * green + .0722 * blue) / 255 < .4;
    })).toBe(true);
    for (const design of DECK_DESIGNS) for (const shape of design.shapes) {
      expect(shape.x).toBeGreaterThanOrEqual(0);
      expect(shape.y).toBeGreaterThanOrEqual(0);
      expect(shape.x + shape.w).toBeLessThanOrEqual(DECK_WIDTH + .0001);
      expect(shape.y + shape.h).toBeLessThanOrEqual(DECK_HEIGHT + .0001);
    }
  });
});
