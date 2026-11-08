import type { DeckDocument, DeckElement } from './types';

export const DECK_WIDTH = 13.34;
export const DECK_HEIGHT = 7.5;

export type DesignShape = { type: 'rect' | 'ellipse' | 'line'; x: number; y: number; w: number; h: number; color: string; transparency?: number };
export type DeckDesign = { id: string; name: string; descriptor: string; background: string; surface: string; text: string; muted: string; accent: string; shapes: DesignShape[] };

export const DECK_DESIGNS: DeckDesign[] = [
  { id: 'midnight', name: 'Midnight', descriptor: 'Signal green · cinematic', background: '#080b12', surface: '#111827', text: '#f8fafc', muted: '#94a3b8', accent: '#10b981', shapes: [
    { type: 'rect', x: 0, y: 0, w: .12, h: 7.5, color: '#10b981' },
    { type: 'ellipse', x: 10.35, y: .35, w: 2.35, h: 2.35, color: '#171f39' },
    { type: 'ellipse', x: 11.1, y: 1.1, w: .85, h: .85, color: '#202c4a' },
    { type: 'line', x: 9.1, y: 6.98, w: 3.5, h: 0, color: '#10b981', transparency: 22 },
  ] },
  { id: 'ocean', name: 'Ocean', descriptor: 'Deep blue · flowing', background: '#071726', surface: '#0d293b', text: '#f0f9ff', muted: '#a6c7d6', accent: '#38bdf8', shapes: [
    { type: 'rect', x: 0, y: 0, w: 13.34, h: .09, color: '#38bdf8' },
    { type: 'ellipse', x: 9.55, y: 4, w: 3.6, h: 3.5, color: '#0c3044' },
    { type: 'ellipse', x: 10.35, y: 4.85, w: 1.9, h: 1.9, color: '#10425a' },
    { type: 'line', x: .72, y: 6.92, w: 4.15, h: 0, color: '#38bdf8', transparency: 30 },
  ] },
  { id: 'aubergine', name: 'Aubergine', descriptor: 'Plum · expressive', background: '#1a1026', surface: '#2a1a38', text: '#fff7ff', muted: '#c9b8d4', accent: '#d8a1ff', shapes: [
    { type: 'rect', x: 0, y: 0, w: .13, h: 7.5, color: '#d8a1ff' },
    { type: 'ellipse', x: 10.5, y: .3, w: 2.25, h: 2.25, color: '#392349' },
    { type: 'ellipse', x: 11.2, y: 1.02, w: .84, h: .84, color: '#503260' },
    { type: 'rect', x: 9.2, y: 7.35, w: 4.14, h: .15, color: '#a463c7' },
  ] },
  { id: 'slate', name: 'Graphite', descriptor: 'Charcoal · precision', background: '#151b24', surface: '#202a35', text: '#f8fafc', muted: '#b2bdc8', accent: '#fbbf24', shapes: [
    { type: 'rect', x: 0, y: 0, w: 13.34, h: .08, color: '#fbbf24' },
    { type: 'rect', x: 12.92, y: .08, w: .42, h: 7.42, color: '#263441' },
    { type: 'line', x: .72, y: .92, w: 2.6, h: 0, color: '#fbbf24', transparency: 15 },
    { type: 'rect', x: .72, y: 7.35, w: 2.2, h: .15, color: '#d89b16' },
  ] },
  { id: 'paper', name: 'Gallery', descriptor: 'Warm ivory · editorial', background: '#f4f0e7', surface: '#fffdf7', text: '#202a32', muted: '#596671', accent: '#b65337', shapes: [
    { type: 'rect', x: 0, y: 0, w: .18, h: 7.5, color: '#b65337' },
    { type: 'rect', x: .18, y: 0, w: 13.16, h: .08, color: '#ded5c7' },
    { type: 'ellipse', x: 10.72, y: .52, w: 1.45, h: 1.45, color: '#e8ddcb' },
    { type: 'ellipse', x: 11.2, y: 1, w: .5, h: .5, color: '#c8ad90' },
    { type: 'line', x: 10.05, y: 6.95, w: 2.55, h: 0, color: '#b65337', transparency: 10 },
  ] },
  { id: 'sage', name: 'Sage', descriptor: 'Soft green · considered', background: '#edf2e8', surface: '#fbfcf7', text: '#1e3028', muted: '#52685d', accent: '#39765b', shapes: [
    { type: 'rect', x: 0, y: 0, w: 13.34, h: .1, color: '#39765b' },
    { type: 'ellipse', x: 10.28, y: .38, w: 2.4, h: 2.4, color: '#dce7d9' },
    { type: 'ellipse', x: 11.08, y: 1.15, w: 1.18, h: 1.18, color: '#c9dccf' },
    { type: 'rect', x: 12.98, y: .1, w: .36, h: 7.4, color: '#d6e2d5' },
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
    .filter(item => item.type === 'shape' && item.visible !== false && item.zIndex < element.zIndex && containsCenter(item, centerX, centerY))
    .sort((a, b) => b.zIndex - a.zIndex)[0];
  const surface = backingShape && originalSurface
    ? themedElementFill(backingShape, originalSurface, design)
    : String(backingShape?.style?.background || backingShape?.style?.fill || background);
  const requested = String(element.style?.color || '#f8fafc');
  if (contrastRatio(requested, surface) >= 4.5) return requested;
  return contrastRatio('#ffffff', surface) >= contrastRatio('#000000', surface) ? '#ffffff' : '#000000';
}
