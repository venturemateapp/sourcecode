import { describe, expect, it } from 'vitest';
import { isInlineSvg, normalizeImageSource } from './imageSource';

describe('logo image source normalization', () => {
  it('repairs a PNG mislabeled as SVG', () => {
    const pngHeader = btoa('\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR');
    const source = `data:image/svg+xml;base64,${pngHeader}`;

    expect(normalizeImageSource(source)).toBe(`data:image/png;base64,${pngHeader}`);
    expect(isInlineSvg(source)).toBe(false);
  });

  it('keeps real inline SVG data URLs unchanged', () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg"><rect width="1" height="1"/></svg>';
    const payload = btoa(svg);
    const source = `data:image/svg+xml;base64,${payload}`;

    expect(normalizeImageSource(source)).toBe(source);
    expect(isInlineSvg(source)).toBe(true);
  });

  it('does not rewrite durable HTTP logo URLs', () => {
    const source = 'https://venturemate.s3.us-east-1.amazonaws.com/logo.png';
    expect(normalizeImageSource(source)).toBe(source);
    expect(isInlineSvg(source)).toBe(false);
  });
});
