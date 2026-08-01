import { useEffect, useState } from 'react';
import {
  Box, Button, Card, Chip, Divider, IconButton, MenuItem, Select, TextField, Tooltip, Typography,
} from '@mui/material';
import {
  ArrowDown, ArrowUp, Copy, Download, FileText, List, Plus, Redo2, Save, Table2, Trash2, Type, Undo2,
} from 'lucide-react';
import jsPDF from 'jspdf';
import { StudioChrome } from '../../components/ai-studio/StudioChrome';
import { useAIStudioProject } from '../../hooks/useAIStudioProject';
import { useUndoRedo } from '../../hooks/useUndoRedo';
import { useBusiness } from '../../contexts/BusinessContext';
import type { PlanBlock, PlanDocumentV2, PlanSectionV2 } from '../../lib/ai-studio/types';

function safePlan(raw?: string, title = 'Business Plan', businessId?: string): PlanDocumentV2 {
  try {
    const parsed = JSON.parse(raw || '') as PlanDocumentV2;
    if (parsed?.schemaVersion === '2.0' && Array.isArray(parsed.sections)) return parsed;
  } catch { /* use starter */ }
  return {
    schemaVersion: '2.0', title, executiveSummary: '',
    metadata: { businessId, versionLabel: '1.0', currency: 'GHS', preparedAt: new Date().toISOString() },
    sections: [{ id: crypto.randomUUID(), title: 'Executive Summary', order: 0, blocks: [{ id: crypto.randomUUID(), type: 'paragraph', text: 'Start writing or ask AI to create a complete business plan.' }] }],
    assumptions: [], theme: { primary: '#10b981' },
  };
}

function planToMarkdown(document: PlanDocumentV2): string {
  const lines = [`# ${document.title}`, '', `**Version:** ${document.metadata.versionLabel || '1.0'}  `, `**Currency:** ${document.metadata.currency || 'GHS'}  `, `**Prepared:** ${new Date(document.metadata.preparedAt || Date.now()).toLocaleDateString()}`, ''];
  if (document.executiveSummary) lines.push('## Executive Summary', '', document.executiveSummary, '');
  document.sections.forEach(section => {
    lines.push(`## ${section.title}`, '');
    section.blocks.forEach(block => {
      if (block.type === 'heading') lines.push(`${'#'.repeat(Math.max(3, Math.min(6, block.level || 3)))} ${block.text || ''}`, '');
      else if (block.type === 'bullet_list' || block.type === 'numbered_list') {
        (block.items || []).forEach((item, index) => lines.push(block.type === 'numbered_list' ? `${index + 1}. ${item}` : `- ${item}`)); lines.push('');
      } else if (block.type === 'table') {
        if (block.headers?.length) { lines.push(`| ${block.headers.join(' | ')} |`, `| ${block.headers.map(() => '---').join(' | ')} |`); }
        (block.rows || []).forEach(row => lines.push(`| ${row.join(' | ')} |`)); lines.push('');
      } else if (block.type === 'image' && block.url) lines.push(`![${block.altText || ''}](${block.url})`, '');
      else if (block.text) lines.push(block.text, '');
    });
  });
  if (document.assumptions?.length) {
    lines.push('## Financial Assumptions', '');
    document.assumptions.forEach(item => lines.push(`- **${item.label}:** ${item.value} ${item.unit} — ${item.description || ''} _(Source: ${item.source})_`));
  }
  return lines.join('\n').trim() + '\n';
}

function downloadBlob(data: BlobPart, type: string, filename: string): void {
  const url = URL.createObjectURL(new Blob([data], { type }));
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = filename; document.body.appendChild(anchor); anchor.click(); anchor.remove(); URL.revokeObjectURL(url);
}

function exportMarkdown(document: PlanDocumentV2): void {
  downloadBlob(planToMarkdown(document), 'text/markdown;charset=utf-8', `${document.title.replace(/[^a-z0-9]+/gi, '-') || 'business-plan'}.md`);
}

function exportPdf(document: PlanDocumentV2): void {
  const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
  const margin = 54; const pageWidth = pdf.internal.pageSize.getWidth(); const pageHeight = pdf.internal.pageSize.getHeight(); const contentWidth = pageWidth - margin * 2;
  let y = margin;
  const ensure = (height: number) => { if (y + height > pageHeight - margin) { pdf.addPage(); y = margin; } };
  const text = (value: string, size = 11, bold = false, spacing = 8) => {
    pdf.setFont('helvetica', bold ? 'bold' : 'normal'); pdf.setFontSize(size); pdf.setTextColor('#172033');
    const lines = pdf.splitTextToSize(value || '', contentWidth); const height = lines.length * size * 1.35; ensure(height + spacing); pdf.text(lines, margin, y); y += height + spacing;
  };
  text(document.title, 25, true, 12); text(`Version ${document.metadata.versionLabel || '1.0'} · ${document.metadata.currency || 'GHS'} · ${new Date(document.metadata.preparedAt || Date.now()).toLocaleDateString()}`, 9, false, 20);
  if (document.executiveSummary) { text('Executive Summary', 16, true); text(document.executiveSummary, 11, false, 16); }
  document.sections.forEach(section => {
    ensure(50); text(section.title, 17, true, 10);
    section.blocks.forEach(block => {
      if (block.type === 'heading') text(block.text || '', 13, true);
      else if (block.type === 'bullet_list' || block.type === 'numbered_list') (block.items || []).forEach((item, index) => text(`${block.type === 'numbered_list' ? `${index + 1}.` : '•'} ${item}`, 10, false, 4));
      else if (block.type === 'table') {
        const rows = [block.headers || [], ...(block.rows || [])];
        rows.forEach((row, index) => text(row.join('   |   '), index === 0 ? 9 : 8, index === 0, 3));
      } else if (block.text) text(block.text, 11, false, 10);
    });
    y += 8;
  });
  pdf.save(`${document.title.replace(/[^a-z0-9]+/gi, '-') || 'business-plan'}.pdf`);
}

const encoder = new TextEncoder();
function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function u16(value: number): Uint8Array { return new Uint8Array([value & 255, value >>> 8 & 255]); }
function u32(value: number): Uint8Array { return new Uint8Array([value & 255, value >>> 8 & 255, value >>> 16 & 255, value >>> 24 & 255]); }
function concat(parts: Uint8Array[]): Uint8Array { const length = parts.reduce((sum, part) => sum + part.length, 0); const out = new Uint8Array(length); let offset = 0; parts.forEach(part => { out.set(part, offset); offset += part.length; }); return out; }
function zipStore(files: Array<{ name: string; content: string }>): Uint8Array {
  const local: Uint8Array[] = []; const central: Uint8Array[] = []; let offset = 0;
  files.forEach(file => {
    const name = encoder.encode(file.name); const data = encoder.encode(file.content); const crc = crc32(data);
    const header = concat([u32(0x04034b50), u16(20), u16(0x0800), u16(0), u16(0), u16(0), u32(crc), u32(data.length), u32(data.length), u16(name.length), u16(0), name, data]);
    local.push(header);
    central.push(concat([u32(0x02014b50), u16(20), u16(20), u16(0x0800), u16(0), u16(0), u16(0), u32(crc), u32(data.length), u32(data.length), u16(name.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(offset), name]));
    offset += header.length;
  });
  const centralBytes = concat(central);
  return concat([...local, centralBytes, u32(0x06054b50), u16(0), u16(0), u16(files.length), u16(files.length), u32(centralBytes.length), u32(offset), u16(0)]);
}
function xml(value: string): string { return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function paragraph(value: string, style?: string): string {
  return `<w:p>${style ? `<w:pPr><w:pStyle w:val="${style}"/></w:pPr>` : ''}<w:r><w:t xml:space="preserve">${xml(value)}</w:t></w:r></w:p>`;
}
function exportDocx(document: PlanDocumentV2): void {
  const body: string[] = [paragraph(document.title, 'Title'), paragraph(`Version ${document.metadata.versionLabel || '1.0'} · ${document.metadata.currency || 'GHS'}`)];
  if (document.executiveSummary) { body.push(paragraph('Executive Summary', 'Heading1'), paragraph(document.executiveSummary)); }
  document.sections.forEach(section => {
    body.push(paragraph(section.title, 'Heading1'));
    section.blocks.forEach(block => {
      if (block.type === 'heading') body.push(paragraph(block.text || '', 'Heading2'));
      else if (block.type === 'bullet_list' || block.type === 'numbered_list') (block.items || []).forEach((item, index) => body.push(paragraph(`${block.type === 'numbered_list' ? `${index + 1}.` : '•'} ${item}`)));
      else if (block.type === 'table') {
        const rows = [block.headers || [], ...(block.rows || [])];
        body.push(`<w:tbl><w:tblPr><w:tblBorders><w:top w:val="single" w:sz="4"/><w:left w:val="single" w:sz="4"/><w:bottom w:val="single" w:sz="4"/><w:right w:val="single" w:sz="4"/><w:insideH w:val="single" w:sz="4"/><w:insideV w:val="single" w:sz="4"/></w:tblBorders></w:tblPr>${rows.map(row => `<w:tr>${row.map(cell => `<w:tc><w:p><w:r><w:t>${xml(cell)}</w:t></w:r></w:p></w:tc>`).join('')}</w:tr>`).join('')}</w:tbl>`);
      } else if (block.text) body.push(paragraph(block.text));
    });
  });
  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body.join('')}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/></w:sectPr></w:body></w:document>`;
  const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style><w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:rPr><w:b/><w:sz w:val="40"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:rPr><w:b/><w:sz w:val="30"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:rPr><w:b/><w:sz w:val="24"/></w:rPr></w:style></w:styles>`;
  const bytes = zipStore([
    { name: '[Content_Types].xml', content: `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>` },
    { name: '_rels/.rels', content: `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>` },
    { name: 'word/document.xml', content: documentXml }, { name: 'word/styles.xml', content: styles },
    { name: 'word/_rels/document.xml.rels', content: `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>` },
  ]);
  downloadBlob(bytes, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', `${document.title.replace(/[^a-z0-9]+/gi, '-') || 'business-plan'}.docx`);
}

function BlockEditor({ block, onChange, onDelete }: { block: PlanBlock; onChange: (next: PlanBlock) => void; onDelete: () => void }) {
  return <Card sx={{ p: 1.25, mb: 1, bgcolor: 'rgba(255,255,255,.025)', border: '1px solid var(--vm-border-subtle)' }}>
    <Box sx={{ display: 'flex', gap: .75, alignItems: 'center', mb: 1 }}><Chip size="small" label={block.type.replaceAll('_', ' ')} sx={{ fontSize: 9 }} /><Box sx={{ flex: 1 }} /><IconButton size="small" color="error" onClick={onDelete}><Trash2 size={13} /></IconButton></Box>
    {(block.type === 'paragraph' || block.type === 'heading' || block.type === 'callout' || block.type === 'quote') && <TextField fullWidth multiline minRows={block.type === 'paragraph' ? 4 : 2} value={block.text || ''} onChange={event => onChange({ ...block, text: event.target.value })} />}
    {(block.type === 'bullet_list' || block.type === 'numbered_list') && <TextField fullWidth multiline minRows={4} value={(block.items || []).join('\n')} onChange={event => onChange({ ...block, items: event.target.value.split('\n') })} helperText="One item per line" />}
    {block.type === 'table' && <Box><TextField fullWidth size="small" label="Headers (comma separated)" value={(block.headers || []).join(', ')} onChange={event => onChange({ ...block, headers: event.target.value.split(',').map(value => value.trim()) })} /><TextField fullWidth multiline minRows={4} label="Rows (comma separated, one row per line)" value={(block.rows || []).map(row => row.join(', ')).join('\n')} onChange={event => onChange({ ...block, rows: event.target.value.split('\n').map(row => row.split(',').map(value => value.trim())) })} sx={{ mt: 1 }} /></Box>}
    {block.type === 'image' && <Box><Box component="img" src={block.url} alt={block.altText || ''} sx={{ width: '100%', maxHeight: 320, objectFit: 'contain', bgcolor: 'rgba(0,0,0,.2)', borderRadius: 1, mb: 1 }} /><TextField fullWidth size="small" label="Image URL" value={block.url || ''} onChange={event => onChange({ ...block, url: event.target.value })} /><TextField fullWidth size="small" label="Alt text" value={block.altText || ''} onChange={event => onChange({ ...block, altText: event.target.value })} sx={{ mt: 1 }} /></Box>}
  </Card>;
}

export function BusinessPlanStudioV2() {
  const { selectedBusiness } = useBusiness();
  const studio = useAIStudioProject('business_plan', selectedBusiness?.id, `${selectedBusiness?.name || 'New'} Business Plan`);
  const source = studio.pendingRevision?.document || studio.approvedRevision?.document;
  const history = useUndoRedo<PlanDocumentV2>(safePlan(source, `${selectedBusiness?.name || 'New'} Business Plan`, selectedBusiness?.id));
  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [format, setFormat] = useState<'pdf' | 'docx' | 'md'>('pdf');

  useEffect(() => {
    const next = safePlan(source, `${selectedBusiness?.name || 'New'} Business Plan`, selectedBusiness?.id);
    history.replace(next); setSelectedSectionId(next.sections[0]?.id || '');
  }, [source]);

  const document = history.value;
  const selectedSection = document.sections.find(section => section.id === selectedSectionId) || document.sections[0];
  const insertAsset = (asset: { url: string; prompt: string }) => {
    if (!selectedSection) return;
    mutateSection(section => { section.blocks.push({ id: crypto.randomUUID(), type: 'image', url: asset.url, altText: asset.prompt || 'Generated business visual' }); });
  };
  const mutate = (updater: (draft: PlanDocumentV2) => void) => history.setValue(current => { const next = structuredClone(current); updater(next); return next; });
  const mutateSection = (updater: (section: PlanSectionV2) => void) => mutate(next => { const section = next.sections.find(item => item.id === selectedSection?.id); if (section) updater(section); });

  const addSection = () => {
    const id = crypto.randomUUID(); mutate(next => next.sections.push({ id, title: 'New Section', order: next.sections.length, blocks: [{ id: crypto.randomUUID(), type: 'paragraph', text: '' }] })); setSelectedSectionId(id);
  };
  const duplicateSection = () => {
    if (!selectedSection) return; const copy = structuredClone(selectedSection); copy.id = crypto.randomUUID(); copy.title += ' Copy'; copy.blocks.forEach(block => { block.id = crypto.randomUUID(); });
    mutate(next => { const index = next.sections.findIndex(item => item.id === selectedSection.id); next.sections.splice(index + 1, 0, copy); next.sections.forEach((item, order) => { item.order = order; }); }); setSelectedSectionId(copy.id);
  };
  const deleteSection = () => {
    if (!selectedSection || document.sections.length <= 1) return; mutate(next => { next.sections = next.sections.filter(item => item.id !== selectedSection.id).map((item, order) => ({ ...item, order })); }); setSelectedSectionId(document.sections.find(item => item.id !== selectedSection.id)?.id || '');
  };
  const moveSection = (direction: -1 | 1) => mutate(next => {
    const index = next.sections.findIndex(item => item.id === selectedSection?.id); const target = index + direction; if (index < 0 || target < 0 || target >= next.sections.length) return;
    [next.sections[index], next.sections[target]] = [next.sections[target], next.sections[index]]; next.sections.forEach((item, order) => { item.order = order; });
  });
  const addBlock = (type: string) => mutateSection(section => section.blocks.push({ id: crypto.randomUUID(), type, text: type === 'heading' ? 'New heading' : '', items: type.includes('list') ? ['New item'] : undefined, headers: type === 'table' ? ['Item', 'Value'] : undefined, rows: type === 'table' ? [['Example', '0']] : undefined }));
  const save = async () => { await studio.saveDocument(JSON.stringify(document), 'Edit business plan'); };
  const runExport = () => { if (format === 'pdf') exportPdf(document); else if (format === 'docx') exportDocx(document); else exportMarkdown(document); };

  const leftRail = <Box>
    <Box sx={{ p: 1, display: 'flex', gap: .4, borderBottom: '1px solid var(--vm-border-subtle)' }}><Button size="small" fullWidth startIcon={<Plus size={13} />} onClick={addSection}>Section</Button><IconButton size="small" onClick={duplicateSection}><Copy size={13} /></IconButton><IconButton size="small" disabled={document.sections.length <= 1} color="error" onClick={deleteSection}><Trash2 size={13} /></IconButton></Box>
    <Box sx={{ p: .75 }}>{document.sections.map((section, index) => <Button key={section.id} fullWidth onClick={() => setSelectedSectionId(section.id)} sx={{ justifyContent: 'flex-start', textTransform: 'none', textAlign: 'left', fontSize: 10, color: section.id === selectedSection?.id ? 'var(--vm-primary-300)' : 'var(--vm-text-secondary)', bgcolor: section.id === selectedSection?.id ? 'rgba(124,58,237,.12)' : 'transparent', mb: .25 }}><Box component="span" sx={{ mr: .75, color: 'var(--vm-text-muted)' }}>{index + 1}.</Box>{section.title}</Button>)}</Box>
  </Box>;

  const toolbar = <>
    <Tooltip title="Undo"><span><IconButton size="small" disabled={!history.canUndo} onClick={history.undo}><Undo2 size={15} /></IconButton></span></Tooltip>
    <Tooltip title="Redo"><span><IconButton size="small" disabled={!history.canRedo} onClick={history.redo}><Redo2 size={15} /></IconButton></span></Tooltip>
    <Button size="small" variant="outlined" startIcon={<Save size={13} />} onClick={() => void save()} disabled={studio.saving}>Save</Button>
    <Select size="small" value={format} onChange={event => setFormat(event.target.value as typeof format)} sx={{ height: 31, fontSize: 10 }}><MenuItem value="pdf">A4 PDF</MenuItem><MenuItem value="docx">Editable DOCX</MenuItem><MenuItem value="md">Markdown</MenuItem></Select>
    <Button size="small" variant="contained" startIcon={<Download size={13} />} onClick={runExport}>Export</Button>
  </>;

  const editor = !studio.project ? <Box sx={{ height: '100%', display: 'grid', placeItems: 'center', p: 3 }}><Card sx={{ p: 4, maxWidth: 540, textAlign: 'center' }}><FileText size={40} style={{ opacity: .7 }} /><Typography variant="h5" fontWeight={900} sx={{ mt: 2 }}>Create a complete editable business plan</Typography><Typography sx={{ color: 'var(--vm-text-muted)', mt: 1 }}>Use AI for the first draft, edit every section and financial assumption, then export a real A4 PDF, DOCX or Markdown file.</Typography><Button variant="contained" sx={{ mt: 2 }} onClick={() => void studio.createProject()}>Create first plan</Button></Card></Box> : <Box sx={{ p: { xs: 1, md: 2 }, overflow: 'auto', display: 'flex', justifyContent: 'center' }}>
    <Box sx={{ width: 'min(100%, 850px)' }}>
      <Card sx={{ p: { xs: 2, md: 4 }, minHeight: 1060, bgcolor: '#fff', color: '#111827', boxShadow: '0 20px 70px rgba(0,0,0,.35)', '& .MuiInputBase-input, & .MuiInputBase-inputMultiline': { color: '#111827' }, '& .MuiInputLabel-root': { color: '#64748b' }, '& fieldset': { borderColor: '#cbd5e1 !important' } }}>
        <TextField fullWidth variant="standard" value={document.title} onChange={event => mutate(next => { next.title = event.target.value; })} InputProps={{ disableUnderline: true, sx: { fontSize: 30, fontWeight: 900 } }} />
        <Box sx={{ display: 'flex', gap: 1, mt: 1, mb: 3 }}><Chip size="small" label={`Version ${document.metadata.versionLabel || '1.0'}`} /><Chip size="small" label={document.metadata.currency || 'GHS'} /><Chip size="small" label={`${document.sections.length} sections`} /></Box>
        <Typography sx={{ fontSize: 11, color: '#64748b', fontWeight: 900, letterSpacing: '.08em' }}>EXECUTIVE SUMMARY</Typography>
        <TextField fullWidth multiline minRows={5} value={document.executiveSummary || ''} onChange={event => mutate(next => { next.executiveSummary = event.target.value; })} placeholder="Summarise the verified opportunity, solution, business model and current stage." sx={{ mt: 1, mb: 3 }} />
        <Divider sx={{ mb: 2 }} />
        {selectedSection && <>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: .5, mb: 1 }}><TextField fullWidth variant="standard" value={selectedSection.title} onChange={event => mutateSection(section => { section.title = event.target.value; })} InputProps={{ disableUnderline: true, sx: { fontSize: 22, fontWeight: 900 } }} /><IconButton size="small" onClick={() => moveSection(-1)}><ArrowUp size={14} /></IconButton><IconButton size="small" onClick={() => moveSection(1)}><ArrowDown size={14} /></IconButton></Box>
          <Box sx={{ display: 'flex', gap: .5, mb: 1.5, flexWrap: 'wrap' }}><Button size="small" startIcon={<Type size={12} />} onClick={() => addBlock('paragraph')}>Paragraph</Button><Button size="small" startIcon={<FileText size={12} />} onClick={() => addBlock('heading')}>Heading</Button><Button size="small" startIcon={<List size={12} />} onClick={() => addBlock('bullet_list')}>Bullets</Button><Button size="small" startIcon={<Table2 size={12} />} onClick={() => addBlock('table')}>Table</Button></Box>
          {selectedSection.blocks.map((block, index) => <BlockEditor key={block.id} block={block} onChange={nextBlock => mutateSection(section => { section.blocks[index] = nextBlock; })} onDelete={() => mutateSection(section => { section.blocks.splice(index, 1); })} />)}
        </>}
        {document.assumptions && document.assumptions.length > 0 && <Box sx={{ mt: 3 }}><Divider sx={{ mb: 2 }} /><Typography sx={{ fontSize: 18, fontWeight: 900, mb: 1 }}>Financial Assumptions</Typography>{document.assumptions.map((assumption, index) => <Card key={assumption.id} variant="outlined" sx={{ p: 1, mb: 1, display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 2fr', gap: .75 }}><TextField size="small" label="Assumption" value={assumption.label} onChange={event => mutate(next => { if (next.assumptions) next.assumptions[index].label = event.target.value; })} /><TextField size="small" type="number" label="Value" value={assumption.value} onChange={event => mutate(next => { if (next.assumptions) next.assumptions[index].value = Number(event.target.value); })} /><TextField size="small" label="Unit" value={assumption.unit} onChange={event => mutate(next => { if (next.assumptions) next.assumptions[index].unit = event.target.value; })} /><TextField size="small" label="Source" value={assumption.source} onChange={event => mutate(next => { if (next.assumptions) next.assumptions[index].source = event.target.value; })} /></Card>)}</Box>}
      </Card>
    </Box>
  </Box>;

  return <StudioChrome
    title="AI Business Plan Studio" subtitle="Long-form editor · financial assumptions · A4 PDF · DOCX · Markdown"
    projects={studio.projects} project={studio.project} revisions={studio.revisions} assets={studio.assets} job={studio.job}
    loading={studio.loading} saving={studio.saving} error={studio.error} pendingRevision={studio.pendingRevision}
    generationContext={selectedSection ? `EDITING SCOPE: Revise only the business-plan section "${selectedSection.title}" (sectionId: ${selectedSection.id}). Preserve every other section unless the user explicitly asks for a broader change.` : undefined}
    leftRail={leftRail} editor={editor} toolbar={toolbar}
    onSelectProject={project => void studio.selectProject(project)} onCreateProject={studio.createProject} onRefresh={() => void studio.load()}
    onGenerate={studio.generate} onApprove={studio.approve} onRollback={studio.rollback} onDismissError={() => studio.setError(null)} onGenerateAsset={studio.generateAsset} onSelectAsset={insertAsset}
    generatePlaceholder="Describe the business plan you need, its audience, geography, stage, verified traction, revenue model and any financial assumptions. AI must clearly label projections and never invent actual results."
    createLabel="Create business plan" starterPrompts={[
      `Write a complete investor-ready business plan for ${selectedBusiness?.name || 'my business'} using all verified business data.`,
      'Expand the market analysis and go-to-market strategy for Ghana and West Africa without fabricating market share.',
      'Create a realistic three-year financial projection and clearly label every assumption.',
      'Rewrite the plan for a bank or grant committee with stronger risk controls and implementation milestones.',
    ]}
  />;
}
