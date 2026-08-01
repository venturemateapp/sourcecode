import { useEffect, useRef, useState } from 'react';
import {
  Box, Button, Card, IconButton, MenuItem, Select, TextField, Tooltip, Typography,
} from '@mui/material';
import {
  ArrowDown, ArrowUp, Copy, Download, Image as ImageIcon, Plus, Redo2, Save, Shapes, Trash2, Type, Undo2,
} from 'lucide-react';
import PptxGenJS from 'pptxgenjs';
import jsPDF from 'jspdf';
import { StudioChrome } from '../../components/ai-studio/StudioChrome';
import { useAIStudioProject } from '../../hooks/useAIStudioProject';
import { useUndoRedo } from '../../hooks/useUndoRedo';
import { useBusiness } from '../../contexts/BusinessContext';
import type { DeckDocument, DeckElement, DeckSlide } from '../../lib/ai-studio/types';

const W = 13.34;
const H = 7.5;

function safeDeck(raw?: string, title = 'Pitch Deck'): DeckDocument {
  try {
    const parsed = JSON.parse(raw || '') as DeckDocument;
    if (parsed?.schemaVersion === '2.0' && Array.isArray(parsed.slides)) return parsed;
  } catch { /* use starter */ }
  return {
    schemaVersion: '2.0', title, template: 'modern-dark',
    theme: { primary: '#10b981', secondary: '#6366f1', background: '#080b12', surface: '#111827', text: '#f8fafc', mutedText: '#94a3b8', headingFont: 'Aptos Display', bodyFont: 'Aptos' },
    slides: [{ id: crypto.randomUUID(), type: 'cover', title, background: { type: 'solid', color: '#080b12' }, order: 0, notes: '', elements: [
      { id: crypto.randomUUID(), type: 'text', x: .8, y: 2.1, w: 10.8, h: 1.2, zIndex: 1, visible: true, locked: false, text: title, style: { fontSize: 42, fontWeight: 800, color: '#f8fafc' } },
      { id: crypto.randomUUID(), type: 'text', x: .85, y: 3.6, w: 8, h: .8, zIndex: 2, visible: true, locked: false, text: 'Add your investor-ready story', style: { fontSize: 20, color: '#94a3b8' } },
    ] }],
  };
}

function cleanHex(value: string | undefined, fallback = '111827'): string {
  const normalized = (value || '').replace('#', '');
  return /^[0-9A-Fa-f]{6}$/.test(normalized) ? normalized.toUpperCase() : fallback;
}

async function imageData(url?: string): Promise<string | undefined> {
  if (!url) return undefined;
  if (url.startsWith('data:image/')) return url;
  try {
    const response = await fetch(url);
    if (!response.ok) return undefined;
    const blob = await response.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(blob);
    });
  } catch { return undefined; }
}

async function exportDeckPptx(document: DeckDocument): Promise<void> {
  const pptx = new PptxGenJS();
  pptx.defineLayout({ name: 'VM_AI_STUDIO', width: W, height: H });
  pptx.layout = 'VM_AI_STUDIO';
  pptx.author = 'VentureMate AI Studio';
  pptx.title = document.title;
  for (const source of document.slides) {
    const slide = pptx.addSlide();
    slide.background = { color: cleanHex(source.background.color || document.theme.background, '080B12') };
    for (const element of [...source.elements].filter(item => item.visible !== false).sort((a, b) => a.zIndex - b.zIndex)) {
      const style = element.style || {};
      if (element.type === 'text') {
        slide.addText(element.text || '', {
          x: element.x, y: element.y, w: element.w, h: element.h,
          fontFace: String(style.fontFamily || document.theme.bodyFont || 'Aptos'),
          fontSize: Number(style.fontSize || 20), bold: Number(style.fontWeight || 400) >= 700,
          color: cleanHex(String(style.color || document.theme.text), 'F8FAFC'),
          align: (String(style.textAlign || 'left') as 'left' | 'center' | 'right'),
          valign: 'middle', margin: Number(style.margin || .04), fit: 'shrink',
        });
      } else if (element.type === 'shape' || element.type === 'line') {
        slide.addShape(element.type === 'line' ? pptx.ShapeType.line : pptx.ShapeType.rect, {
          x: element.x, y: element.y, w: element.w, h: element.h,
          fill: element.type === 'line' ? undefined : { color: cleanHex(String(style.background || style.fill || document.theme.primary), '10B981'), transparency: Math.max(0, Math.min(100, 100 - Number(style.opacity || 1) * 100)) },
          line: { color: cleanHex(String(style.borderColor || style.color || document.theme.primary), '10B981'), width: Number(style.borderWidth || 1) },
          rotate: element.rotation || 0,
        });
      } else if (element.type === 'image') {
        const data = await imageData(element.url);
        if (data) slide.addImage({ data, x: element.x, y: element.y, w: element.w, h: element.h, rotate: element.rotation || 0 });
      }
    }
    if (source.notes) slide.addNotes(source.notes);
  }
  const fileName = `${document.title.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'pitch-deck'}.pptx`;
  await pptx.writeFile({ fileName, compression: true });
}

async function exportDeckPdf(document: DeckDocument): Promise<void> {
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'in', format: [W, H] });
  for (const [index, source] of document.slides.entries()) {
    if (index) pdf.addPage([W, H], 'landscape');
    const background = source.background.color || document.theme.background;
    pdf.setFillColor(background); pdf.rect(0, 0, W, H, 'F');
    for (const element of [...source.elements].filter(item => item.visible !== false).sort((a, b) => a.zIndex - b.zIndex)) {
      const style = element.style || {};
      if (element.type === 'text') {
        pdf.setTextColor(String(style.color || document.theme.text));
        pdf.setFontSize(Number(style.fontSize || 20) * .75);
        pdf.setFont('helvetica', Number(style.fontWeight || 400) >= 700 ? 'bold' : 'normal');
        const lines = pdf.splitTextToSize(element.text || '', element.w);
        pdf.text(lines, element.x, element.y + .25, { maxWidth: element.w, baseline: 'top', angle: element.rotation || 0 });
      } else if (element.type === 'shape') {
        pdf.setFillColor(String(style.background || style.fill || document.theme.primary));
        pdf.roundedRect(element.x, element.y, element.w, element.h, .08, .08, 'F');
      } else if (element.type === 'line') {
        pdf.setDrawColor(String(style.borderColor || style.color || document.theme.primary));
        pdf.setLineWidth(Math.max(.01, Number(style.borderWidth || 1) / 72));
        pdf.line(element.x, element.y, element.x + element.w, element.y + element.h);
      } else if (element.type === 'image') {
        const data = await imageData(element.url);
        if (data && !data.startsWith('data:image/svg')) {
          const format = data.startsWith('data:image/jpeg') ? 'JPEG' : data.startsWith('data:image/webp') ? 'WEBP' : 'PNG';
          pdf.addImage(data, format, element.x, element.y, element.w, element.h, undefined, 'FAST', element.rotation || 0);
        }
      }
    }
  }
  pdf.save(`${document.title.replace(/[^a-z0-9]+/gi, '-') || 'pitch-deck'}.pdf`);
}

function styleNumber(element: DeckElement, key: string, fallback: number): number {
  return Number(element.style?.[key] ?? fallback);
}

export function PitchDeckStudioV2() {
  const { selectedBusiness } = useBusiness();
  const studio = useAIStudioProject('pitch_deck', selectedBusiness?.id, `${selectedBusiness?.name || 'New'} Pitch Deck`);
  const sourceDocument = studio.pendingRevision?.document || studio.approvedRevision?.document;
  const history = useUndoRedo<DeckDocument>(safeDeck(sourceDocument, `${selectedBusiness?.name || 'New'} Pitch Deck`));
  const [selectedSlideId, setSelectedSlideId] = useState('');
  const [selectedElementId, setSelectedElementId] = useState('');
  const [exportMenu, setExportMenu] = useState<'pdf' | 'pptx'>('pptx');
  const [drag, setDrag] = useState<{ id: string; startX: number; startY: number; originX: number; originY: number; width: number; height: number } | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const next = safeDeck(sourceDocument, `${selectedBusiness?.name || 'New'} Pitch Deck`);
    history.replace(next);
    setSelectedSlideId(next.slides[0]?.id || '');
    setSelectedElementId('');
  }, [sourceDocument]);

  const document = history.value;
  const selectedSlide = document.slides.find(slide => slide.id === selectedSlideId) || document.slides[0];
  const selectedElement = selectedSlide?.elements.find(element => element.id === selectedElementId) || null;

  const updateDocument = (updater: (draft: DeckDocument) => DeckDocument) => history.setValue(current => updater(structuredClone(current)));
  const updateSlide = (updater: (slide: DeckSlide) => void) => updateDocument(next => {
    const slide = next.slides.find(item => item.id === selectedSlide?.id); if (slide) updater(slide); return next;
  });
  const updateElement = (patch: Partial<DeckElement>) => updateSlide(slide => {
    const element = slide.elements.find(item => item.id === selectedElementId); if (element) Object.assign(element, patch);
  });
  const updateElementStyle = (patch: Record<string, unknown>) => updateSlide(slide => {
    const element = slide.elements.find(item => item.id === selectedElementId); if (element) element.style = { ...(element.style || {}), ...patch };
  });

  const addSlide = () => {
    const id = crypto.randomUUID();
    updateDocument(next => { next.slides.push({ id, type: 'custom', title: 'New Slide', order: next.slides.length, notes: '', background: { type: 'solid', color: next.theme.background }, elements: [] }); return next; });
    setSelectedSlideId(id); setSelectedElementId('');
  };
  const duplicateSlide = () => {
    if (!selectedSlide) return;
    const copy = structuredClone(selectedSlide); copy.id = crypto.randomUUID(); copy.title += ' Copy'; copy.elements.forEach(element => { element.id = crypto.randomUUID(); });
    updateDocument(next => { const index = next.slides.findIndex(item => item.id === selectedSlide.id); next.slides.splice(index + 1, 0, copy); next.slides.forEach((item, order) => { item.order = order; }); return next; });
    setSelectedSlideId(copy.id);
  };
  const deleteSlide = () => {
    if (!selectedSlide || document.slides.length <= 1) return;
    updateDocument(next => { next.slides = next.slides.filter(item => item.id !== selectedSlide.id).map((item, order) => ({ ...item, order })); return next; });
    setSelectedSlideId(document.slides.find(item => item.id !== selectedSlide.id)?.id || ''); setSelectedElementId('');
  };
  const moveSlide = (direction: -1 | 1) => {
    if (!selectedSlide) return;
    updateDocument(next => {
      const index = next.slides.findIndex(item => item.id === selectedSlide.id);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= next.slides.length) return next;
      [next.slides[index], next.slides[target]] = [next.slides[target], next.slides[index]];
      next.slides.forEach((slide, order) => { slide.order = order; });
      return next;
    });
  };
  const addElement = (type: 'text' | 'shape' | 'image') => {
    if (!selectedSlide) return;
    const element: DeckElement = { id: crypto.randomUUID(), type, x: 1, y: 1, w: type === 'text' ? 5 : 3, h: type === 'text' ? .9 : 2, zIndex: selectedSlide.elements.length + 1, visible: true, locked: false, text: type === 'text' ? 'Edit this text' : undefined, shape: type === 'shape' ? 'rectangle' : undefined, style: type === 'text' ? { fontSize: 24, fontWeight: 700, color: document.theme.text } : { background: document.theme.primary, opacity: 1 } };
    if (type === 'image') element.url = studio.assets[0]?.url || 'data:image/svg+xml;charset=UTF-8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%221200%22 height=%22675%22 viewBox=%220 0 1200 675%22%3E%3Crect width=%221200%22 height=%22675%22 fill=%22%23111827%22/%3E%3Ctext x=%22600%22 y=%22338%22 text-anchor=%22middle%22 dominant-baseline=%22middle%22 fill=%22%2394a3b8%22 font-family=%22Arial%22 font-size=%2240%22%3EGenerate or choose an image%3C/text%3E%3C/svg%3E';
    updateSlide(slide => slide.elements.push(element)); setSelectedElementId(element.id);
  };

  const save = async () => { await studio.saveDocument(JSON.stringify(document), 'Edit pitch deck'); };
  const exportDeck = async () => { if (exportMenu === 'pptx') await exportDeckPptx(document); else await exportDeckPdf(document); };

  const beginDrag = (event: React.PointerEvent, element: DeckElement) => {
    if (element.locked || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    setSelectedElementId(element.id);
    setDrag({ id: element.id, startX: event.clientX, startY: event.clientY, originX: element.x, originY: element.y, width: rect.width, height: rect.height });
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  };
  const moveDrag = (event: React.PointerEvent) => {
    if (!drag) return;
    const dx = (event.clientX - drag.startX) / drag.width * W;
    const dy = (event.clientY - drag.startY) / drag.height * H;
    updateSlide(slide => { const element = slide.elements.find(item => item.id === drag.id); if (element) { element.x = Math.max(0, Math.min(W - element.w, drag.originX + dx)); element.y = Math.max(0, Math.min(H - element.h, drag.originY + dy)); } });
  };

  const insertAsset = (asset: { url: string }) => {
    if (!selectedSlide) return;
    if (selectedElement?.type === 'image') {
      updateElement({ url: asset.url });
      return;
    }
    const element: DeckElement = { id: crypto.randomUUID(), type: 'image', x: 8.7, y: 1.15, w: 3.7, h: 4.7, zIndex: selectedSlide.elements.length + 1, visible: true, locked: false, url: asset.url, style: { opacity: 1 } };
    updateSlide(slide => { slide.elements.push(element); });
    setSelectedElementId(element.id);
  };

  const leftRail = (
    <Box>
      <Box sx={{ p: 1, display: 'flex', gap: .5, borderBottom: '1px solid var(--vm-border-subtle)' }}>
        <Button size="small" fullWidth startIcon={<Plus size={13} />} onClick={addSlide}>Slide</Button>
        <IconButton size="small" onClick={() => moveSlide(-1)} disabled={!selectedSlide || selectedSlide.order <= 0}><ArrowUp size={14} /></IconButton>
        <IconButton size="small" onClick={() => moveSlide(1)} disabled={!selectedSlide || selectedSlide.order >= document.slides.length - 1}><ArrowDown size={14} /></IconButton>
        <IconButton size="small" onClick={duplicateSlide}><Copy size={14} /></IconButton>
        <IconButton size="small" color="error" disabled={document.slides.length <= 1} onClick={deleteSlide}><Trash2 size={14} /></IconButton>
      </Box>
      <Box sx={{ p: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
        {document.slides.map((slide, index) => (
          <Card key={slide.id} onClick={() => { setSelectedSlideId(slide.id); setSelectedElementId(''); }} sx={{ cursor: 'pointer', overflow: 'hidden', border: slide.id === selectedSlide?.id ? '2px solid var(--vm-primary-500)' : '1px solid var(--vm-border-subtle)', bgcolor: slide.background.color || document.theme.background }}>
            <Box sx={{ aspectRatio: '16/9', p: .8, position: 'relative' }}><Typography sx={{ color: document.theme.text, fontSize: 9, fontWeight: 800 }}>{slide.title || `Slide ${index + 1}`}</Typography></Box>
            <Box sx={{ px: .75, py: .45, bgcolor: '#0b0f17' }}><Typography sx={{ fontSize: 8, color: 'var(--vm-text-muted)' }}>{index + 1}. {slide.type}</Typography></Box>
          </Card>
        ))}
      </Box>
    </Box>
  );

  const toolbar = (
    <>
      <Tooltip title="Undo"><span><IconButton size="small" disabled={!history.canUndo} onClick={history.undo}><Undo2 size={15} /></IconButton></span></Tooltip>
      <Tooltip title="Redo"><span><IconButton size="small" disabled={!history.canRedo} onClick={history.redo}><Redo2 size={15} /></IconButton></span></Tooltip>
      <Button size="small" startIcon={<Type size={13} />} onClick={() => addElement('text')}>Text</Button>
      <Button size="small" startIcon={<Shapes size={13} />} onClick={() => addElement('shape')}>Shape</Button>
      <Button size="small" startIcon={<ImageIcon size={13} />} onClick={() => addElement('image')}>Image</Button>
      <Button size="small" variant="outlined" startIcon={<Save size={13} />} onClick={() => void save()} disabled={studio.saving}>Save</Button>
      <Select size="small" value={exportMenu} onChange={event => setExportMenu(event.target.value as 'pdf' | 'pptx')} sx={{ fontSize: 10, height: 31 }}><MenuItem value="pptx">Editable PPTX</MenuItem><MenuItem value="pdf">PDF</MenuItem></Select>
      <Button size="small" variant="contained" startIcon={<Download size={13} />} onClick={() => void exportDeck()}>Export</Button>
    </>
  );

  const editor = !studio.project ? (
    <Box sx={{ height: '100%', display: 'grid', placeItems: 'center', p: 3 }}><Card sx={{ p: 4, maxWidth: 520, textAlign: 'center' }}><Typography variant="h5" fontWeight={900}>Create an editable AI pitch deck</Typography><Typography sx={{ color: 'var(--vm-text-muted)', mt: 1 }}>Generate investor-ready slides, adjust every element, then export native editable PowerPoint or PDF.</Typography><Button variant="contained" sx={{ mt: 2 }} onClick={() => void studio.createProject()}>Create first deck</Button></Card></Box>
  ) : (
    <Box sx={{ height: '100%', display: 'grid', gridTemplateRows: 'minmax(0,1fr) auto' }}>
      <Box sx={{ minHeight: 0, overflow: 'auto', p: { xs: 1, md: 2 }, display: 'grid', placeItems: 'center', backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,.08) 1px, transparent 0)', backgroundSize: '20px 20px' }}>
        {selectedSlide && <Box ref={canvasRef} onPointerMove={moveDrag} onPointerUp={() => setDrag(null)} onPointerCancel={() => setDrag(null)} sx={{ width: 'min(100%, 1100px)', aspectRatio: '16/9', position: 'relative', overflow: 'hidden', bgcolor: selectedSlide.background.color || document.theme.background, boxShadow: '0 22px 80px rgba(0,0,0,.55)', borderRadius: .5 }}>
          {[...selectedSlide.elements].sort((a, b) => a.zIndex - b.zIndex).map(element => {
            const selected = element.id === selectedElementId;
            const common = { position: 'absolute', left: `${element.x / W * 100}%`, top: `${element.y / H * 100}%`, width: `${element.w / W * 100}%`, height: `${element.h / H * 100}%`, transform: `rotate(${element.rotation || 0}deg)`, zIndex: element.zIndex, border: selected ? '2px solid #8b5cf6' : '1px solid transparent', cursor: element.locked ? 'default' : 'move', userSelect: 'none', overflow: 'hidden' } as const;
            if (element.type === 'text') return <Box key={element.id} onPointerDown={event => beginDrag(event, element)} onDoubleClick={() => setSelectedElementId(element.id)} sx={{ ...common, color: String(element.style?.color || document.theme.text), fontSize: `clamp(8px, ${styleNumber(element, 'fontSize', 20) / 1100 * 100}vw, ${styleNumber(element, 'fontSize', 20)}px)`, fontWeight: styleNumber(element, 'fontWeight', 400), textAlign: String(element.style?.textAlign || 'left') as 'left', display: 'flex', alignItems: 'center', whiteSpace: 'pre-wrap', p: .25 }}>{element.text}</Box>;
            if (element.type === 'image') return <Box key={element.id} component="img" src={element.url} alt={element.altText || ''} onPointerDown={event => beginDrag(event, element)} sx={{ ...common, objectFit: String(element.style?.objectFit || 'cover') }} />;
            return <Box key={element.id} onPointerDown={event => beginDrag(event, element)} sx={{ ...common, bgcolor: String(element.style?.background || element.style?.fill || document.theme.primary), opacity: Number(element.style?.opacity ?? 1), borderRadius: Number(element.style?.borderRadius ?? 0) }} />;
          })}
        </Box>}
      </Box>
      <Box sx={{ borderTop: '1px solid var(--vm-border-subtle)', bgcolor: '#0b0f17', p: 1.25, display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 2fr' }, gap: 1.5 }}>
        <Box>
          <Typography sx={{ fontSize: 9, color: 'var(--vm-text-muted)', mb: .5 }}>SLIDE</Typography>
          <TextField size="small" fullWidth label="Slide title" value={selectedSlide?.title || ''} onChange={event => updateSlide(slide => { slide.title = event.target.value; })} />
          <TextField size="small" fullWidth label="Speaker notes" multiline minRows={2} value={selectedSlide?.notes || ''} onChange={event => updateSlide(slide => { slide.notes = event.target.value; })} sx={{ mt: 1 }} />
        </Box>
        <Box>
          <Typography sx={{ fontSize: 9, color: 'var(--vm-text-muted)', mb: .5 }}>SELECTED ELEMENT</Typography>
          {selectedElement ? <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: '2fr repeat(4, 1fr)' }, gap: .75 }}>
            {selectedElement.type === 'text' ? <TextField size="small" label="Text" value={selectedElement.text || ''} onChange={event => updateElement({ text: event.target.value })} /> : selectedElement.type === 'image' ? <TextField size="small" label="Image URL" value={selectedElement.url || ''} onChange={event => updateElement({ url: event.target.value })} /> : <TextField size="small" label="Fill" value={String(selectedElement.style?.background || document.theme.primary)} onChange={event => updateElementStyle({ background: event.target.value })} />}
            {(['x', 'y', 'w', 'h'] as const).map(key => <TextField key={key} size="small" type="number" label={key.toUpperCase()} value={selectedElement[key]} onChange={event => updateElement({ [key]: Number(event.target.value) })} inputProps={{ step: .1 }} />)}
            {selectedElement.type === 'text' && <TextField size="small" type="number" label="Font" value={styleNumber(selectedElement, 'fontSize', 20)} onChange={event => updateElementStyle({ fontSize: Number(event.target.value) })} />}
            <Button color="error" startIcon={<Trash2 size={13} />} onClick={() => { updateSlide(slide => { slide.elements = slide.elements.filter(item => item.id !== selectedElement.id); }); setSelectedElementId(''); }}>Delete</Button>
          </Box> : <Typography sx={{ fontSize: 11, color: 'var(--vm-text-muted)' }}>Select an element to edit its content, position and size. Drag elements directly on the canvas.</Typography>}
        </Box>
      </Box>
    </Box>
  );

  return <StudioChrome
    title="AI Pitch Deck Studio" subtitle="Editable 16:9 canvas · native PPTX · PDF · revision history"
    projects={studio.projects} project={studio.project} revisions={studio.revisions} assets={studio.assets} job={studio.job}
    loading={studio.loading} saving={studio.saving} error={studio.error} pendingRevision={studio.pendingRevision}
    generationContext={selectedSlide ? `EDITING SCOPE: Revise only slide "${selectedSlide.title}" (slideId: ${selectedSlide.id})${selectedElement ? ` and only the selected ${selectedElement.type} element (elementId: ${selectedElement.id})` : ''}. Preserve all other slides and elements unless the user explicitly asks for a broader change.` : undefined}
    leftRail={leftRail} editor={editor} toolbar={toolbar}
    onSelectProject={project => void studio.selectProject(project)} onCreateProject={studio.createProject} onRefresh={() => void studio.load()}
    onGenerate={studio.generate} onApprove={studio.approve} onRollback={studio.rollback} onDismissError={() => studio.setError(null)} onGenerateAsset={studio.generateAsset} onSelectAsset={insertAsset}
    generatePlaceholder="Describe the investor story, target audience, funding stage, traction, numbers you can verify, preferred visual style and what the deck should persuade investors to do."
    createLabel="Create pitch deck" starterPrompts={[
      `Create a 12-slide investor pitch deck for ${selectedBusiness?.name || 'my business'} using only verified business information.`,
      'Strengthen the problem, solution and market narrative without inventing metrics.',
      'Redesign the current deck with a modern editorial visual system and concise slide copy.',
      'Add a realistic financial outlook and funding ask, clearly labelling assumptions.',
    ]}
  />;
}
