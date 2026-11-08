import type { DeckDocument, DeckElement } from './types';

export const DECK_WIDTH = 13.34;
export const DECK_HEIGHT = 7.5;

export type DesignShape = { type: 'rect' | 'ellipse' | 'line'; x: number; y: number; w: number; h: number; color: string; transparency?: number };
export type DeckDesign = { id: string; name: string; descriptor: string; background: string; surface: string; text: string; muted: string; accent: string; shapes: DesignShape[] };

export const DECK_DESIGNS: DeckDesign[] = [
  { id: 'midnight', name: 'Emerald', descriptor: 'Clean white · emerald accents', background: '#ffffff', surface: '#f5fbf8', text: '#17231f', muted: '#52645d', accent: '#07865f', shapes: [
    { type: 'rect', x: 0, y: 0, w: .12, h: 7.5, color: '#07865f' },
    { type: 'ellipse', x: 10.35, y: .35, w: 2.35, h: 2.35, color: '#e2f3eb' },
    { type: 'ellipse', x: 11.1, y: 1.1, w: .85, h: .85, color: '#c5e9d8' },
    { type: 'line', x: 9.1, y: 6.98, w: 3.5, h: 0, color: '#07865f', transparency: 22 },
  ] },
  { id: 'ocean', name: 'Sky', descriptor: 'Bright white · sky blue accents', background: '#ffffff', surface: '#f3faff', text: '#17232b', muted: '#536774', accent: '#087fae', shapes: [
    { type: 'rect', x: 0, y: 0, w: 13.34, h: .09, color: '#168dbd' },
    { type: 'ellipse', x: 9.55, y: 4, w: 3.6, h: 3.5, color: '#e4f4fb' },
    { type: 'ellipse', x: 10.35, y: 4.85, w: 1.9, h: 1.9, color: '#cbeaf7' },
    { type: 'line', x: .72, y: 6.92, w: 4.15, h: 0, color: '#168dbd', transparency: 20 },
  ] },
  { id: 'aubergine', name: 'Orchid', descriptor: 'Soft white · orchid accents', background: '#ffffff', surface: '#fcf7ff', text: '#2c2032', muted: '#6d5a75', accent: '#8b4ba5', shapes: [
    { type: 'rect', x: 0, y: 0, w: .13, h: 7.5, color: '#8b4ba5' },
    { type: 'ellipse', x: 10.5, y: .3, w: 2.25, h: 2.25, color: '#f1e7f5' },
    { type: 'ellipse', x: 11.2, y: 1.02, w: .84, h: .84, color: '#e3d0ed' },
    { type: 'rect', x: 9.2, y: 7.35, w: 4.14, h: .15, color: '#a66abd' },
  ] },
  { id: 'slate', name: 'Saffron', descriptor: 'Warm white · saffron accents', background: '#ffffff', surface: '#fffaf0', text: '#2b2618', muted: '#6b624e', accent: '#a76b00', shapes: [
    { type: 'rect', x: 0, y: 0, w: 13.34, h: .08, color: '#d49216' },
    { type: 'rect', x: 12.92, y: .08, w: .42, h: 7.42, color: '#f6edda' },
    { type: 'line', x: .72, y: .92, w: 2.6, h: 0, color: '#c58812', transparency: 10 },
    { type: 'rect', x: .72, y: 7.35, w: 2.2, h: .15, color: '#d49216' },
  ] },
  { id: 'paper', name: 'Gallery', descriptor: 'Pure white · editorial layout', background: '#ffffff', surface: '#fffdf9', text: '#202a32', muted: '#596671', accent: '#a94e35', shapes: [
    { type: 'rect', x: 0, y: 0, w: .18, h: 7.5, color: '#a94e35' },
    { type: 'rect', x: .18, y: 0, w: 13.16, h: .08, color: '#e8e3dc' },
    { type: 'ellipse', x: 10.72, y: .52, w: 1.45, h: 1.45, color: '#f3e9df' },
    { type: 'ellipse', x: 11.2, y: 1, w: .5, h: .5, color: '#dfc4b1' },
    { type: 'line', x: 10.05, y: 6.95, w: 2.55, h: 0, color: '#a94e35', transparency: 10 },
  ] },
  { id: 'sage', name: 'Sage', descriptor: 'Fresh white · sage accents', background: '#ffffff', surface: '#f5faf5', text: '#1e3028', muted: '#52685d', accent: '#39765b', shapes: [
    { type: 'rect', x: 0, y: 0, w: 13.34, h: .1, color: '#39765b' },
    { type: 'ellipse', x: 10.28, y: .38, w: 2.4, h: 2.4, color: '#e8f1e8' },
    { type: 'ellipse', x: 11.08, y: 1.15, w: 1.18, h: 1.18, color: '#d6e8d9' },
    { type: 'rect', x: 12.98, y: .1, w: .36, h: 7.4, color: '#edf4ed' },
    { type: 'line', x: .72, y: 6.98, w: 3.3, h: 0, color: '#39765b', transparency: 15 },
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
