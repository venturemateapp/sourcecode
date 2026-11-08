import PptxGenJS from 'pptxgenjs';
import type { Slide } from '../types/venturemate';
import { graphqlRequest } from './api';
import { normalizeImageSource } from './imageSource';

export interface PitchDeckExportOptions {
  slides: Slide[];
  title: string;
  businessName: string;
  businessId?: string;
  primary: string;
  secondary?: string;
  logo?: string;
  style?: 'classic' | 'premium';
}

const cleanHex = (value: string | undefined, fallback: string) => {
  const cleaned = (value || '').replace('#', '').trim();
  return /^[0-9a-fA-F]{6}$/.test(cleaned) ? cleaned.toUpperCase() : fallback;
};

export const safeDownloadName = (value: string, fallback = 'pitch-deck') => {
  const normalized = value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-_.]+|[-_.]+$/g, '')
    .slice(0, 100);
  return normalized || fallback;
};

const truncate = (value: string | undefined, max: number) => {
  const text = (value || '').trim();
  return text.length > max ? `${text.slice(0, max - 1).trim()}…` : text;
};

async function businessLogoData(businessId: string): Promise<string> {
  const query = `query BusinessLogoData($businessId: ID!) { businessLogoData(businessId: $businessId) }`;
  const result = await graphqlRequest<{ businessLogoData: string }>(query, { businessId });
  return result.businessLogoData;
}

async function remoteImageData(source?: string, businessId?: string): Promise<string | undefined> {
  if (!source) return undefined;
  const normalized = normalizeImageSource(source);
  if (normalized.startsWith('data:image/')) return normalized;
  try {
    const response = await fetch(normalized, { mode: 'cors' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const blob = await response.blob();
    if (!blob.type.startsWith('image/')) throw new Error('The source did not return an image.');
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  } catch (cause) {
    if (businessId) {
      try {
        return normalizeImageSource(await businessLogoData(businessId));
      } catch (fallbackError) {
        const detail = fallbackError instanceof Error ? fallbackError.message : String(fallbackError);
        throw new Error(`The logo is visible in VentureMate, but its image could not be read for export. ${detail}`);
      }
    }
    console.warn('Could not embed remote image for export', normalized, cause);
    return undefined;
  }
}

export async function imageToPngDataUri(source?: string, businessId?: string): Promise<string | undefined> {
  const toPng = (imageData: string) => {
    if (imageData.startsWith('data:image/png')) return Promise.resolve(imageData);
    return new Promise<string | undefined>(resolve => {
    const image = new Image();
    image.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        const context = canvas.getContext('2d');
        if (!context || !canvas.width || !canvas.height) return resolve(undefined);
        context.drawImage(image, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      } catch {
        resolve(undefined);
      }
    };
    image.onerror = () => resolve(undefined);
    image.src = imageData;
    });
  };
  const imageData = await remoteImageData(source, businessId);
  if (!imageData) return undefined;
  const png = await toPng(imageData);
  if (png || !businessId) return png;
  try {
    const canonicalLogo = normalizeImageSource(await businessLogoData(businessId));
    if (canonicalLogo !== imageData) return toPng(canonicalLogo);
  } catch (error) {
    console.warn('Could not load the approved logo for export', error);
  }
  return undefined;
}

export async function imageToDataUri(source?: string, businessId?: string): Promise<string | undefined> {
  return remoteImageData(source, businessId);
}

function addDeckChrome(
  pptx: PptxGenJS,
  slide: PptxGenJS.Slide,
  index: number,
  total: number,
  businessName: string,
  primary: string,
  premium: boolean,
  logoData?: string,
) {
  slide.background = { color: premium ? '080B12' : '101827' };
  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: 0.11, h: 7.5,
    line: { color: primary, transparency: 100 },
    fill: { color: primary },
  });
  if (logoData) {
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 0.58, y: 0.19, w: 0.46, h: 0.46,
      rectRadius: 0.06,
      line: { color: '334155', transparency: 40, width: 0.75 },
      fill: { color: '0B1220' },
    });
    slide.addImage({ data: logoData, x: 0.63, y: 0.24, w: 0.36, h: 0.36 });
  }
  slide.addText(businessName, {
    x: logoData ? 1.18 : 0.62, y: 0.28, w: 5.5, h: 0.28,
    fontFace: 'Aptos', fontSize: 10, bold: true,
    color: 'CBD5E1', charSpacing: 0.8, margin: 0,
  });
  slide.addText(`${String(index + 1).padStart(2, '0')} / ${String(total).padStart(2, '0')}`, {
    x: 11.7, y: 0.28, w: 1, h: 0.28,
    fontFace: 'Aptos', fontSize: 9, color: '64748B',
    align: 'right', margin: 0,
  });
  slide.addShape(pptx.ShapeType.line, {
    x: 0.62, y: 0.72, w: 12.05, h: 0,
    line: { color: '253047', transparency: 15, width: 1 },
  });
}

function addTitle(slide: PptxGenJS.Slide, title: string, primary: string, y = 1.04) {
  slide.addText(truncate(title, 90), {
    x: 0.72, y, w: 11.8, h: 0.9,
    fontFace: 'Aptos Display', fontSize: 31, bold: true,
    color: 'F8FAFC', breakLine: false, margin: 0,
    fit: 'shrink',
  });
  slide.addShape('rect', {
    x: 0.72, y: y + 1.02, w: 0.82, h: 0.07,
    line: { color: primary, transparency: 100 },
    fill: { color: primary },
  });
}

function addStandardContent(slide: PptxGenJS.Slide, data: Slide, primary: string, imageData?: string) {
  addTitle(slide, data.title, primary);
  const hasImage = Boolean(imageData);
  const contentWidth = hasImage ? 6.55 : 11.6;
  if (data.content) {
    slide.addText(truncate(data.content, 700), {
      x: 0.76, y: 2.28, w: contentWidth, h: data.bullets?.length ? 1.35 : 3.6,
      fontFace: 'Aptos', fontSize: 18, color: 'CBD5E1',
      breakLine: false, valign: 'top', margin: 0.04,
      fit: 'shrink', paraSpaceAfter: 9,
    });
  }
  if (data.bullets?.length) {
    const bullets = data.bullets.slice(0, 7).map(item => `•  ${truncate(item, 180)}`).join('\n');
    slide.addText(bullets, {
      x: 0.8, y: data.content ? 3.85 : 2.35, w: contentWidth, h: data.content ? 2.55 : 3.95,
      fontFace: 'Aptos', fontSize: 16, color: 'E2E8F0',
      breakLine: false, valign: 'top', margin: 0,
      fit: 'shrink', paraSpaceAfter: 12,
      bullet: { type: 'bullet' },
    });
  }
  if (imageData) {
    slide.addShape('roundRect', {
      x: 7.72, y: 1.72, w: 4.75, h: 4.85,
      rectRadius: 0.08,
      line: { color: '334155', transparency: 30, width: 1 },
      fill: { color: '111827' },
    });
    slide.addImage({ data: imageData, x: 7.84, y: 1.84, w: 4.51, h: 4.61, transparency: 0 });
  }
}

export async function exportPitchDeckPptx(options: PitchDeckExportOptions): Promise<string> {
  if (!options.slides.length) throw new Error('The pitch deck has no slides to export.');
  const pptx = new PptxGenJS();
  pptx.defineLayout({ name: 'VENTUREMATE_WIDE', width: 13.333, height: 7.5 });
  pptx.layout = 'VENTUREMATE_WIDE';
  pptx.author = options.businessName || 'VentureMate';
  pptx.company = options.businessName || 'VentureMate';
  pptx.subject = 'Investor pitch deck';
  pptx.title = options.title || `${options.businessName} Pitch Deck`;
  pptx.theme = {
    headFontFace: 'Aptos Display',
    bodyFontFace: 'Aptos',
  };

  const primary = cleanHex(options.primary, '10B981');
  const secondary = cleanHex(options.secondary, '6366F1');
  const premium = options.style !== 'classic';
  const logoData = await imageToPngDataUri(options.logo, options.businessId);
  if (options.logo && !logoData) throw new Error('The business logo could not be loaded for export. Check the logo source and try again.');

  for (let index = 0; index < options.slides.length; index++) {
    const data = options.slides[index];
    const slide = pptx.addSlide();
    addDeckChrome(pptx, slide, index, options.slides.length, options.businessName, primary, premium, logoData);
    const imageData = await remoteImageData(data.image);

    if (index === 0 || data.type === 'title') {
      slide.addShape(pptx.ShapeType.ellipse, {
        x: 8.4, y: -1.1, w: 6.2, h: 6.2,
        line: { color: secondary, transparency: 100 },
        fill: { color: secondary, transparency: 72 },
      });
      slide.addShape(pptx.ShapeType.ellipse, {
        x: 9.5, y: 3.9, w: 4.4, h: 4.4,
        line: { color: primary, transparency: 100 },
        fill: { color: primary, transparency: 78 },
      });
      if (logoData) slide.addImage({ data: logoData, x: 0.78, y: 1.1, w: 1.15, h: 1.15, transparency: 0 });
      slide.addText(truncate(data.title || options.title, 100), {
        x: 0.78, y: 2.35, w: 9.9, h: 1.5,
        fontFace: 'Aptos Display', fontSize: 42, bold: true,
        color: 'FFFFFF', margin: 0, fit: 'shrink',
      });
      if (data.content) slide.addText(truncate(data.content, 360), {
        x: 0.82, y: 4.12, w: 8.6, h: 1.25,
        fontFace: 'Aptos', fontSize: 20, color: 'CBD5E1',
        margin: 0, fit: 'shrink',
      });
      slide.addText(options.businessName, {
        x: 0.82, y: 6.42, w: 5, h: 0.35,
        fontFace: 'Aptos', fontSize: 12, bold: true, color: primary, margin: 0,
      });
    } else {
      addStandardContent(slide, data, primary, imageData);
    }
    slide.addNotes(data.content ? `Speaker notes:\n${data.content}` : 'Speaker notes');
  }

  const fileName = `${safeDownloadName(options.title || options.businessName)}-pitch-deck.pptx`;
  await pptx.writeFile({ fileName, compression: true });
  return fileName;
}
