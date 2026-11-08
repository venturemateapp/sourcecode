import { describe, expect, it, vi } from 'vitest';
import type { DeckDocument } from '../../lib/ai-studio/types';

const pptx = vi.hoisted(() => ({ slide: { background: {} as unknown, addShape: vi.fn(), addText: vi.fn(), addImage: vi.fn(), addNotes: vi.fn() }, writeFile: vi.fn() }));
vi.mock('pptxgenjs', () => ({ default: class {
  ShapeType = { rect: 'rect', ellipse: 'ellipse', line: 'line' };
  defineLayout() {}
  addSlide() { return pptx.slide; }
  writeFile = pptx.writeFile;
} }));

import { exportDeckPptx } from './PitchDeckStudioV2';

describe('pitch deck PowerPoint export', () => {
  it('exports the selected design as native shapes while keeping slide text', async () => {
    const document = {
      title: 'Test', metadata: { backgroundDesign: 'ocean' },
      theme: { background: '#000000', text: '#ffffff', primary: '#10b981', bodyFont: 'Aptos' },
      slides: [{ order: 0, background: { color: '#000000' }, elements: [
        { id: 'background', type: 'shape', x: 0, y: 0, w: 13.333, h: 7.5, zIndex: 0, visible: true, style: { background: '#000000' } },
        { id: 'text', type: 'text', text: 'Hello investors', x: 1, y: 1, w: 4, h: 1, zIndex: 1, visible: true, style: { color: '#f8fafc' } },
      ] }],
    } as unknown as DeckDocument;
    await exportDeckPptx(document);
    expect(pptx.slide.background).toEqual({ color: 'FFFFFF' });
    expect(pptx.slide.addShape).toHaveBeenCalledTimes(4);
    expect(pptx.slide.addShape).toHaveBeenCalledWith('ellipse', expect.objectContaining({ fill: { color: 'E4F4FB', transparency: 0 } }));
    expect(pptx.slide.addText).toHaveBeenCalledWith('Hello investors', expect.objectContaining({ color: '000000' }));
    expect(pptx.writeFile).toHaveBeenCalledOnce();
  });
});
