import type { DeckDocument, DeckElement } from './types';

export const DECK_WIDTH = 13.34;
export const DECK_HEIGHT = 7.5;

type DesignShape = { type: 'rect' | 'ellipse'; x: number; y: number; w: number; h: number; color: string };
export type DeckDesign = { id: string; name: string; background: string; shapes: DesignShape[] };

// Colors are opaque so the canvas, PDF and PowerPoint use the same artwork.
export const DECK_DESIGNS: DeckDesign[] = [
  { id: 'midnight', name: 'Midnight (default)', background: '#080b12', shapes: [
    { type: 'rect', x: 0, y: 0, w: .12, h: 7.5, color: '#10b981' },
    { type: 'ellipse', x: 10.1, y: .25, w: 2.8, h: 2.8, color: '#151c32' },
    { type: 'rect', x: 10.7, y: 7.37, w: 2.64, h: .13, color: '#24355c' },
  ] },
  { id: 'ocean', name: 'Ocean', background: '#071726', shapes: [
    { type: 'rect', x: 0, y: 0, w: 13.34, h: .12, color: '#38bdf8' },
    { type: 'ellipse', x: 10, y: 4.2, w: 3.1, h: 3.1, color: '#10364b' },
    { type: 'rect', x: 0, y: 7.35, w: 4.2, h: .15, color: '#145a70' },
  ] },
  { id: 'aubergine', name: 'Aubergine', background: '#1a1026', shapes: [
    { type: 'rect', x: 0, y: 0, w: .12, h: 7.5, color: '#c084fc' },
    { type: 'ellipse', x: 10.15, y: .2, w: 2.8, h: 2.8, color: '#382044' },
    { type: 'rect', x: 9.1, y: 7.35, w: 4.24, h: .15, color: '#794496' },
  ] },
  { id: 'slate', name: 'Slate', background: '#151b24', shapes: [
    { type: 'rect', x: 0, y: 0, w: 13.34, h: .1, color: '#fbbf24' },
    { type: 'rect', x: 11.8, y: .1, w: 1.54, h: 7.4, color: '#222c38' },
    { type: 'rect', x: 0, y: 7.35, w: 3.5, h: .15, color: '#b88820' },
  ] },
];

export function getDeckDesign(document: DeckDocument): DeckDesign | undefined {
  return DECK_DESIGNS.find(design => design.id === document.metadata?.backgroundDesign);
}

// Generated decks often contain a full-slide rectangle as their background.
// Keep it in the document so choosing Original restores it.
export function isCoveredBackground(element: DeckElement, design?: DeckDesign): boolean {
  return Boolean(design && element.type === 'shape' && element.x <= 0 && element.y <= 0 && element.w >= 13.3 && element.h >= 7.5);
}
