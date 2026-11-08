import type { DeckDocument, DeckElement } from './types';

export const DECK_WIDTH = 13.34;
export const DECK_HEIGHT = 7.5;

export type DesignShape = { type: 'rect' | 'ellipse' | 'line'; x: number; y: number; w: number; h: number; color: string; transparency?: number };
export type DeckDesign = { id: string; name: string; descriptor: string; background: string; surface: string; text: string; muted: string; accent: string; shapes: DesignShape[] };

/*
  Layout notes (13.34 x 7.5 in):
  - Content safe zone is roughly x 0.72–12.6, y 1.0–6.8. All decoration stays on the edges/corners.
  - Shapes are drawn back-to-front, so large soft tints come first, then mid tones, then crisp accents.
  - Layered ellipses with transparency fake gradients/glows; stepped rects fake gradient bands.
  - IDs are unchanged for the first six so saved decks keep their design.
*/
export const DECK_DESIGNS: DeckDesign[] = [
  // 1. EMERALD — double rail, layered orbit top-right, hairline footer
  { id: 'midnight', name: 'Emerald', descriptor: 'Clean white · emerald orbit', background: '#ffffff', surface: '#f5fbf8', text: '#17231f', muted: '#52645d', accent: '#07865f', shapes: [
    { type: 'rect', x: 0, y: 0, w: .12, h: 7.5, color: '#07865f' },
    { type: 'rect', x: .12, y: 0, w: .05, h: 7.5, color: '#7fd1b0', transparency: 45 },
    { type: 'ellipse', x: 9.85, y: .15, w: 3.0, h: 3.0, color: '#e2f3eb', transparency: 10 },
    { type: 'ellipse', x: 10.45, y: .75, w: 1.8, h: 1.8, color: '#c5e9d8', transparency: 15 },
    { type: 'ellipse', x: 11.05, y: 1.35, w: .6, h: .6, color: '#07865f', transparency: 10 },
    { type: 'ellipse', x: 9.6, y: 2.95, w: .16, h: .16, color: '#07865f', transparency: 45 },
    { type: 'line', x: .72, y: 6.98, w: 11.9, h: 0, color: '#cfe8dd' },
    { type: 'line', x: .72, y: 6.98, w: 1.4, h: 0, color: '#07865f' },
    { type: 'rect', x: 12.34, y: 7.38, w: 1.0, h: .12, color: '#07865f' },
  ] },

  // 2. SKY — dual top bar, wave-like discs bottom-right
  { id: 'ocean', name: 'Sky', descriptor: 'Bright white · sky horizon', background: '#ffffff', surface: '#f3faff', text: '#17232b', muted: '#536774', accent: '#087fae', shapes: [
    { type: 'rect', x: 0, y: 0, w: 13.34, h: .09, color: '#168dbd' },
    { type: 'rect', x: 0, y: .09, w: 13.34, h: .03, color: '#9fd7ee', transparency: 40 },
    { type: 'ellipse', x: 9.2, y: 3.85, w: 4.1, h: 3.65, color: '#e4f4fb', transparency: 10 },
    { type: 'ellipse', x: 10.0, y: 4.6, w: 2.6, h: 2.6, color: '#cbeaf7', transparency: 20 },
    { type: 'ellipse', x: 10.85, y: 5.45, w: 1.0, h: 1.0, color: '#168dbd', transparency: 25 },
    { type: 'ellipse', x: 12.2, y: .45, w: .28, h: .28, color: '#9fd7ee' },
    { type: 'ellipse', x: 12.62, y: .62, w: .14, h: .14, color: '#168dbd', transparency: 30 },
    { type: 'line', x: .72, y: 6.92, w: 4.15, h: 0, color: '#168dbd', transparency: 20 },
    { type: 'line', x: .72, y: 6.98, w: 1.6, h: 0, color: '#087fae' },
  ] },

  // 3. ORCHID — left rail, overlapping petals, stepped gradient footer
  { id: 'aubergine', name: 'Orchid', descriptor: 'Soft white · orchid bloom', background: '#ffffff', surface: '#fcf7ff', text: '#2c2032', muted: '#6d5a75', accent: '#8b4ba5', shapes: [
    { type: 'rect', x: 0, y: 0, w: .13, h: 7.5, color: '#8b4ba5' },
    { type: 'ellipse', x: 10.2, y: .2, w: 2.5, h: 2.5, color: '#f1e7f5', transparency: 10 },
    { type: 'ellipse', x: 11.2, y: .2, w: 1.9, h: 1.9, color: '#e3d0ed', transparency: 35 },
    { type: 'ellipse', x: 10.7, y: 1.1, w: 1.5, h: 1.5, color: '#c9a2da', transparency: 45 },
    { type: 'ellipse', x: 11.45, y: .95, w: .4, h: .4, color: '#8b4ba5', transparency: 15 },
    { type: 'rect', x: 8.2, y: 7.35, w: 1.8, h: .15, color: '#e3d0ed' },
    { type: 'rect', x: 10.0, y: 7.35, w: 1.8, h: .15, color: '#c9a2da' },
    { type: 'rect', x: 11.8, y: 7.35, w: 1.54, h: .15, color: '#8b4ba5' },
    { type: 'line', x: .72, y: 6.98, w: 2.2, h: 0, color: '#8b4ba5', transparency: 20 },
  ] },

  // 4. SAFFRON — warm top bar, side rail with notch, stacked footer blocks
  { id: 'slate', name: 'Saffron', descriptor: 'Warm white · saffron rail', background: '#ffffff', surface: '#fffaf0', text: '#2b2618', muted: '#6b624e', accent: '#a76b00', shapes: [
    { type: 'rect', x: 0, y: 0, w: 13.34, h: .08, color: '#d49216' },
    { type: 'rect', x: 12.92, y: .08, w: .42, h: 7.42, color: '#f6edda' },
    { type: 'rect', x: 12.92, y: 1.0, w: .42, h: 1.1, color: '#e9c777', transparency: 20 },
    { type: 'rect', x: 12.92, y: 1.0, w: .1, h: 1.1, color: '#d49216' },
    { type: 'line', x: .72, y: .92, w: 2.6, h: 0, color: '#c58812', transparency: 10 },
    { type: 'ellipse', x: 11.35, y: 5.7, w: 1.3, h: 1.3, color: '#fbf1da', transparency: 10 },
    { type: 'ellipse', x: 11.75, y: 6.1, w: .5, h: .5, color: '#f0d089' },
    { type: 'rect', x: .72, y: 7.35, w: 2.2, h: .15, color: '#d49216' },
    { type: 'rect', x: 2.92, y: 7.35, w: .8, h: .15, color: '#f0d089' },
  ] },

  // 5. GALLERY — editorial: heavy spine, header rule, circle pair, folio rule
  { id: 'paper', name: 'Gallery', descriptor: 'Pure white · editorial spine', background: '#ffffff', surface: '#fffdf9', text: '#202a32', muted: '#596671', accent: '#a94e35', shapes: [
    { type: 'rect', x: 0, y: 0, w: .18, h: 7.5, color: '#a94e35' },
    { type: 'rect', x: .18, y: 0, w: .05, h: 7.5, color: '#e8d2c6' },
    { type: 'rect', x: .23, y: 0, w: 13.11, h: .08, color: '#e8e3dc' },
    { type: 'ellipse', x: 10.55, y: .45, w: 1.8, h: 1.8, color: '#f3e9df' },
    { type: 'ellipse', x: 11.45, y: 1.35, w: 1.1, h: 1.1, color: '#dfc4b1', transparency: 35 },
    { type: 'ellipse', x: 11.0, y: .95, w: .3, h: .3, color: '#a94e35' },
    { type: 'line', x: .72, y: 6.95, w: 11.9, h: 0, color: '#e8e3dc' },
    { type: 'line', x: 10.05, y: 6.95, w: 2.55, h: 0, color: '#a94e35' },
  ] },

  // 6. SAGE — top bar, soft leaf cluster, right rail
  { id: 'sage', name: 'Sage', descriptor: 'Fresh white · sage leaves', background: '#ffffff', surface: '#f5faf5', text: '#1e3028', muted: '#52685d', accent: '#39765b', shapes: [
    { type: 'rect', x: 0, y: 0, w: 13.34, h: .1, color: '#39765b' },
    { type: 'rect', x: 12.98, y: .1, w: .36, h: 7.4, color: '#edf4ed' },
    { type: 'ellipse', x: 10.1, y: .3, w: 2.6, h: 2.6, color: '#e8f1e8', transparency: 10 },
    { type: 'ellipse', x: 10.9, y: 1.05, w: 1.5, h: 1.5, color: '#d6e8d9', transparency: 15 },
    { type: 'ellipse', x: 9.75, y: 1.7, w: .9, h: .9, color: '#bcd9c4', transparency: 30 },
    { type: 'ellipse', x: 11.6, y: .6, w: .3, h: .3, color: '#39765b', transparency: 20 },
    { type: 'line', x: .72, y: 6.98, w: 3.3, h: 0, color: '#39765b', transparency: 15 },
    { type: 'line', x: .72, y: 6.98, w: 1.0, h: 0, color: '#39765b' },
  ] },

  // 7. INDIGO — NEW: cool corporate, diagonal feel via stepped blocks
  { id: 'indigo', name: 'Indigo', descriptor: 'Crisp white · indigo steps', background: '#ffffff', surface: '#f5f6ff', text: '#1b1f3b', muted: '#575d82', accent: '#3d4fd1', shapes: [
    { type: 'rect', x: 0, y: 0, w: 13.34, h: .1, color: '#3d4fd1' },
    { type: 'rect', x: 11.9, y: .1, w: 1.44, h: .5, color: '#e6e9ff' },
    { type: 'rect', x: 12.4, y: .6, w: .94, h: .5, color: '#d0d5ff' },
    { type: 'rect', x: 12.9, y: 1.1, w: .44, h: .5, color: '#a9b2f5' },
    { type: 'ellipse', x: 10.4, y: 4.9, w: 2.6, h: 2.6, color: '#eef0ff', transparency: 10 },
    { type: 'ellipse', x: 11.2, y: 6.0, w: 1.0, h: 1.0, color: '#3d4fd1', transparency: 80 },
    { type: 'line', x: .72, y: 6.98, w: 11.9, h: 0, color: '#dfe2fa' },
    { type: 'line', x: .72, y: 6.98, w: 1.8, h: 0, color: '#3d4fd1' },
    { type: 'rect', x: 0, y: 7.4, w: 13.34, h: .1, color: '#e6e9ff' },
  ] },

  // 8. ROSE — NEW: warm blush, soft halo bottom-left + top-right balance
  { id: 'rose', name: 'Rose', descriptor: 'Blush white · rose halo', background: '#ffffff', surface: '#fff6f7', text: '#33191f', muted: '#7a5a62', accent: '#c2415d', shapes: [
    { type: 'rect', x: 0, y: 0, w: .1, h: 7.5, color: '#c2415d' },
    { type: 'ellipse', x: 10.3, y: .25, w: 2.7, h: 2.7, color: '#fde9ec', transparency: 5 },
    { type: 'ellipse', x: 11.0, y: .95, w: 1.3, h: 1.3, color: '#f8cbd3' },
    { type: 'ellipse', x: 11.4, y: 1.35, w: .5, h: .5, color: '#c2415d', transparency: 15 },
    { type: 'ellipse', x: 9.9, y: .9, w: .2, h: .2, color: '#c2415d', transparency: 50 },
    { type: 'rect', x: .72, y: 7.35, w: 1.2, h: .15, color: '#c2415d' },
    { type: 'rect', x: 1.92, y: 7.35, w: 2.2, h: .15, color: '#f8cbd3' },
    { type: 'line', x: 8.6, y: 6.98, w: 4.0, h: 0, color: '#c2415d', transparency: 35 },
  ] },

  // 9. GRAPHITE — NEW: neutral monochrome, minimal & architectural
  { id: 'graphite', name: 'Graphite', descriptor: 'Studio white · graphite lines', background: '#ffffff', surface: '#f6f7f8', text: '#16191d', muted: '#5a626b', accent: '#2f3a46', shapes: [
    { type: 'rect', x: 0, y: 0, w: 13.34, h: .07, color: '#2f3a46' },
    { type: 'rect', x: 12.7, y: .07, w: .64, h: 7.43, color: '#f1f3f5' },
    { type: 'line', x: 12.7, y: .07, w: 0, h: 7.43, color: '#d9dde2' },
    { type: 'ellipse', x: 11.0, y: .45, w: 1.2, h: 1.2, color: '#e9ecef' },
    { type: 'ellipse', x: 11.45, y: .9, w: .3, h: .3, color: '#2f3a46' },
    { type: 'line', x: .72, y: 6.98, w: 11.4, h: 0, color: '#d9dde2' },
    { type: 'rect', x: .72, y: 7.34, w: .5, h: .16, color: '#2f3a46' },
    { type: 'rect', x: 1.22, y: 7.34, w: .5, h: .16, color: '#8a939d' },
    { type: 'rect', x: 1.72, y: 7.34, w: .5, h: .16, color: '#d9dde2' },
  ] },
];

export function getDeckDesign(document: DeckDocument): DeckDesign | undefined {
  return DECK_DESIGNS.find(design => design.id === document.metadata?.backgroundDesign);
}

export function isCoveredBackground(element: DeckElement, design?: DeckDesign): boolean {
  return Boolean(design && element.type === 'shape' && element.x <= 0 && element.y <= 0 && element.w >= 13.3 && element.h >= 7.5);
}

export function themedElementFill(element: DeckElement, originalSurface: string, design?: DeckDesign): string {
  const fill = String(element.style?.background || element.style?.fill || originalSurface);
  return design && fill.toLowerCase() === originalSurface.toLowerCase() ? design.surface : fill;
}

function rgb(hex: string): [number, number, number] | undefined {
  const value = hex.replace(/^#/, '').trim();
  if (!/^[\da-f]{6}$/i.test(value)) return undefined;
  return [0, 2, 4].map(index => parseInt(value.slice(index, index + 2), 16)) as [number, number, number];
}

function luminance(color: [number, number, number]): number {
  const channels = color.map(channel => {
    const normalized = channel / 255;
    return normalized <= .04045 ? normalized / 12.92 : ((normalized + .055) / 1.055) ** 2.4;
  });
  return .2126 * channels[0] + .7152 * channels[1] + .0722 * channels[2];
}

function contrastRatio(first: string, second: string): number {
  const a = rgb(first); const b = rgb(second);
  if (!a || !b) return 0;
  const values = [luminance(a), luminance(b)].sort((left, right) => right - left);
  return (values[0] + .05) / (values[1] + .05);
}

function containsCenter(element: DeckElement, x: number, y: number): boolean {
  return x >= element.x && x <= element.x + element.w && y >= element.y && y <= element.y + element.h;
}

export function readableTextColor(element: DeckElement, elements: DeckElement[], background: string, originalSurface?: string, design?: DeckDesign): string {
  const centerX = element.x + element.w / 2;
  const centerY = element.y + element.h / 2;
  const backingShape = [...elements]
    .filter(item => item.type === 'shape' && item.visible !== false && item.zIndex < element.zIndex && !isCoveredBackground(item, design) && containsCenter(item, centerX, centerY))
    .sort((a, b) => b.zIndex - a.zIndex)[0];
  const surface = backingShape && originalSurface
    ? themedElementFill(backingShape, originalSurface, design)
    : String(backingShape?.style?.background || backingShape?.style?.fill || background);
  const requested = String(element.style?.color || '#f8fafc');
  if (contrastRatio(requested, surface) >= 4.5) return requested;
  return contrastRatio('#ffffff', surface) >= contrastRatio('#000000', surface) ? '#ffffff' : '#000000';
}
