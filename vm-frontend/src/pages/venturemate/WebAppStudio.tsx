import { useEffect, useMemo, useState } from 'react';
import {
  Box, Button, Card, Chip, CircularProgress, Divider, IconButton, MenuItem, Tab, Tabs, TextField, Tooltip, Typography,
} from '@mui/material';
import {
  Braces, Code2, Download, ExternalLink, FileCode2, Folder, Laptop, Monitor, Play,
  Save, Smartphone, Tablet, TerminalSquare,
} from 'lucide-react';
import { StudioChrome } from '../../components/ai-studio/StudioChrome';
import { useBusiness } from '../../contexts/BusinessContext';
import { useAIStudioProject } from '../../hooks/useAIStudioProject';
import {
  authenticatedDownload, buildDownloadUrl, sourceDownloadUrl, startAIDeployment, startAIRepair,
} from '../../lib/ai-studio/api';
import type { AIProjectFile } from '../../lib/ai-studio/types';

function languageLabel(file: AIProjectFile): string {
  return file.language || file.path.split('.').pop()?.toUpperCase() || 'TEXT';
}

type PreviewNode = { nodeId: string; tagName: string; text: string };
type PreviewRuntimeError = { message: string; filename?: string; line?: number; column?: number };

export function WebAppStudio() {
  const { selectedBusiness } = useBusiness();
  const studio = useAIStudioProject('web_app', selectedBusiness?.id, `${selectedBusiness?.name || 'New'} AI App`);
  const [selectedPath, setSelectedPath] = useState('src/App.tsx');
  const [draft, setDraft] = useState('');
  const [specDraft, setSpecDraft] = useState('{}');
  const [mode, setMode] = useState<'preview' | 'code' | 'spec' | 'build'>('preview');
  const [device, setDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [actionBusy, setActionBusy] = useState(false);
  const [deployProvider, setDeployProvider] = useState<'venturemate' | 'github' | 'netlify'>('venturemate');
  const [selectedPreviewNode, setSelectedPreviewNode] = useState<PreviewNode | null>(null);
  const [previewErrors, setPreviewErrors] = useState<PreviewRuntimeError[]>([]);

  const selectedFile = useMemo(() => studio.files.find(file => file.path === selectedPath) || studio.files[0] || null, [selectedPath, studio.files]);
  const latestBuild = studio.builds.find(build => build.status === 'completed' && build.previewUrl) || null;
  const failedBuild = studio.builds.find(build => build.status === 'failed') || null;
  const currentDocument = studio.pendingRevision?.document || studio.approvedRevision?.document || '{}';
  const studioPreviewUrl = useMemo(() => {
    if (!latestBuild?.previewUrl || typeof window === 'undefined') return latestBuild?.previewUrl || '';
    try {
      const url = new URL(latestBuild.previewUrl, window.location.origin);
      url.searchParams.set('studioOrigin', window.location.origin);
      return url.toString();
    } catch {
      return latestBuild.previewUrl;
    }
  }, [latestBuild?.previewUrl]);
  const previewOrigin = useMemo(() => {
    if (!latestBuild?.previewUrl || typeof window === 'undefined') return '';
    try { return new URL(latestBuild.previewUrl, window.location.origin).origin; } catch { return ''; }
  }, [latestBuild?.previewUrl]);
  const generationContext = selectedPreviewNode
    ? `Edit only the selected preview element unless broader changes are explicitly required. nodeId=${selectedPreviewNode.nodeId}; tag=${selectedPreviewNode.tagName}; currentText=${JSON.stringify(selectedPreviewNode.text.slice(0, 300))}`
    : undefined;

  useEffect(() => { setSpecDraft(currentDocument); }, [currentDocument]);

  useEffect(() => {
    setSelectedPreviewNode(null);
    setPreviewErrors([]);
  }, [latestBuild?.id]);

  useEffect(() => {
    if (!previewOrigin) return undefined;
    const receive = (event: MessageEvent) => {
      if (event.origin !== previewOrigin || !event.data || typeof event.data !== 'object') return;
      const message = event.data as { source?: unknown; type?: unknown; payload?: unknown };
      if (message.source !== 'venturemate-preview' || !message.payload || typeof message.payload !== 'object') return;
      if (message.type === 'select') {
        const payload = message.payload as Partial<PreviewNode>;
        if (typeof payload.nodeId === 'string' && typeof payload.tagName === 'string' && typeof payload.text === 'string') {
          setSelectedPreviewNode({ nodeId: payload.nodeId, tagName: payload.tagName, text: payload.text });
        }
      }
      if (message.type === 'runtime-error') {
        const payload = message.payload as Partial<PreviewRuntimeError>;
        if (typeof payload.message === 'string') {
          setPreviewErrors(current => [...current.slice(-19), { message: payload.message, filename: payload.filename, line: payload.line, column: payload.column }]);
        }
      }
    };
    window.addEventListener('message', receive);
    return () => window.removeEventListener('message', receive);
  }, [previewOrigin]);

  useEffect(() => {
    if (selectedFile) {
      setSelectedPath(selectedFile.path);
      setDraft(selectedFile.currentContent);
    } else {
      setDraft('');
    }
  }, [selectedFile?.contentHash, selectedFile?.path]);

  const saveFile = async () => {
    if (!selectedFile || draft === selectedFile.currentContent) return;
    await studio.saveFile(selectedFile, draft, `Edit ${selectedFile.path}`);
  };

  const saveSpec = async () => {
    JSON.parse(specDraft);
    await studio.saveDocument(specDraft, 'Update application specification');
  };

  const runBuild = async () => {
    setActionBusy(true);
    try { await studio.build(); setMode('build'); } finally { setActionBusy(false); }
  };

  const repairBuild = async (buildId: string) => {
    if (!studio.project) return;
    setActionBusy(true);
    studio.setError(null);
    try {
      const job = await startAIRepair(studio.project.id, buildId);
      studio.watch(job);
    } catch (cause) {
      studio.setError(cause instanceof Error ? cause.message : 'Repair job could not be started.');
    } finally { setActionBusy(false); }
  };

  const publish = async () => {
    if (!studio.project || !latestBuild) {
      studio.setError('Create a successful production build before publishing.');
      return;
    }
    setActionBusy(true);
    studio.setError(null);
    try {
      const job = await startAIDeployment(studio.project.id, latestBuild.id, deployProvider);
      studio.watch(job);
    } catch (cause) {
      studio.setError(cause instanceof Error ? cause.message : 'Deployment could not be started.');
    } finally { setActionBusy(false); }
  };

  const downloadSource = async () => {
    if (!studio.project) return;
    await authenticatedDownload(sourceDownloadUrl(studio.project.id), `${studio.project.slug || 'ai-app'}-source.zip`);
  };

  const width = device === 'desktop' ? '100%' : device === 'tablet' ? 820 : 390;

  const leftRail = (
    <Box>
      <Box sx={{ px: 1.25, py: 1, display: 'flex', alignItems: 'center', gap: .75, borderBottom: '1px solid var(--vm-border-subtle)' }}>
        <Folder size={14} /><Typography sx={{ fontSize: 11, fontWeight: 800 }}>PROJECT FILES</Typography>
      </Box>
      <Box sx={{ py: .75 }}>
        {studio.files.map(file => (
          <Button key={file.path} fullWidth onClick={() => { setSelectedPath(file.path); setMode('code'); }} startIcon={<FileCode2 size={13} />}
            sx={{ px: 1.25, py: .65, justifyContent: 'flex-start', textTransform: 'none', color: file.path === selectedPath ? 'var(--vm-primary-300)' : 'var(--vm-text-secondary)', bgcolor: file.path === selectedPath ? 'rgba(124,58,237,.12)' : 'transparent', fontSize: 10, overflow: 'hidden' }}>
            <Box component="span" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.path}</Box>
          </Button>
        ))}
        {!studio.files.length && <Typography sx={{ p: 2, fontSize: 10, color: 'var(--vm-text-muted)' }}>Create a project to initialise the React workspace.</Typography>}
      </Box>
      <Divider />
      <Box sx={{ p: 1 }}>
        <Typography sx={{ fontSize: 9, color: 'var(--vm-text-muted)', mb: .75 }}>WORKSPACE</Typography>
        <Button fullWidth size="small" onClick={() => setMode('spec')} startIcon={<Braces size={13} />} sx={{ justifyContent: 'flex-start', fontSize: 10 }}>App specification</Button>
        <Button fullWidth size="small" onClick={() => setMode('build')} startIcon={<TerminalSquare size={13} />} sx={{ justifyContent: 'flex-start', fontSize: 10 }}>Builds & diagnostics</Button>
      </Box>
    </Box>
  );

  const toolbar = (
    <>
      <Tabs value={mode} onChange={(_, value) => setMode(value)} sx={{ minHeight: 34, '& .MuiTab-root': { minHeight: 34, px: 1, fontSize: 10 } }}>
        <Tab value="preview" label="Preview" />
        <Tab value="code" label="Code" />
        <Tab value="spec" label="AppSpec" />
        <Tab value="build" label="Build" />
      </Tabs>
      <TextField select size="small" value={deployProvider} onChange={event => setDeployProvider(event.target.value as typeof deployProvider)}
        aria-label="Deployment provider" sx={{ minWidth: 118, '& .MuiInputBase-root': { height: 32, fontSize: 10 } }}>
        <MenuItem value="venturemate">VentureMate</MenuItem>
        <MenuItem value="github">GitHub</MenuItem>
        <MenuItem value="netlify">Netlify</MenuItem>
      </TextField>
      <Button size="small" variant="outlined" startIcon={actionBusy ? <CircularProgress size={13} /> : <Play size={14} />} disabled={!studio.project?.approvedRevisionId || actionBusy} onClick={() => void runBuild()}>Build</Button>
    </>
  );

  const editor = !studio.project ? (
    <Box sx={{ height: '100%', display: 'grid', placeItems: 'center', p: 3 }}>
      <Card sx={{ maxWidth: 560, p: 4, textAlign: 'center', bgcolor: 'rgba(255,255,255,.025)' }}>
        <Code2 size={42} style={{ opacity: .7 }} />
        <Typography variant="h5" sx={{ mt: 2, fontWeight: 900 }}>Build a complete AI web app</Typography>
        <Typography sx={{ mt: 1, color: 'var(--vm-text-muted)', fontSize: 13 }}>Generate a responsive React application, edit every file, approve revisions, compile it in an isolated worker and publish a durable preview.</Typography>
        <Button variant="contained" sx={{ mt: 2 }} onClick={() => void studio.createProject()}>Create first app</Button>
      </Card>
    </Box>
  ) : mode === 'preview' ? (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ px: 1.5, py: .75, borderBottom: '1px solid var(--vm-border-subtle)', display: 'flex', alignItems: 'center', gap: .5 }}>
        <Tooltip title="Desktop"><IconButton size="small" color={device === 'desktop' ? 'primary' : 'default'} onClick={() => setDevice('desktop')}><Monitor size={15} /></IconButton></Tooltip>
        <Tooltip title="Tablet"><IconButton size="small" color={device === 'tablet' ? 'primary' : 'default'} onClick={() => setDevice('tablet')}><Tablet size={15} /></IconButton></Tooltip>
        <Tooltip title="Mobile"><IconButton size="small" color={device === 'mobile' ? 'primary' : 'default'} onClick={() => setDevice('mobile')}><Smartphone size={15} /></IconButton></Tooltip>
        {selectedPreviewNode && <Chip size="small" color="secondary" label={`${selectedPreviewNode.tagName} · ${selectedPreviewNode.nodeId}`} onDelete={() => setSelectedPreviewNode(null)} sx={{ maxWidth: 330, '& .MuiChip-label': { overflow: 'hidden', textOverflow: 'ellipsis' } }} />}
        <Box sx={{ flex: 1 }} />
        {latestBuild?.previewUrl && <Button size="small" endIcon={<ExternalLink size={13} />} href={latestBuild.previewUrl} target="_blank" rel="noreferrer">Open preview</Button>}
      </Box>
      <Box sx={{ flex: 1, p: { xs: 1, md: 2 }, overflow: 'auto', bgcolor: '#05070b', display: 'flex', justifyContent: 'center' }}>
        {latestBuild?.previewUrl ? (
          <Box component="iframe" title={`${studio.project.name} preview`} src={studioPreviewUrl} sandbox="allow-scripts allow-forms allow-popups allow-modals allow-same-origin" sx={{ width, maxWidth: '100%', height: '100%', minHeight: 520, border: '1px solid var(--vm-border-subtle)', borderRadius: 2, bgcolor: 'white', transition: 'width .25s ease' }} />
        ) : (
          <Card sx={{ alignSelf: 'center', maxWidth: 500, p: 3, textAlign: 'center', bgcolor: 'rgba(255,255,255,.025)' }}>
            <Laptop size={38} style={{ opacity: .6 }} /><Typography sx={{ mt: 1.5, fontWeight: 900 }}>No compiled preview yet</Typography>
            <Typography sx={{ mt: .75, color: 'var(--vm-text-muted)', fontSize: 12 }}>Approve a revision, then build it. The isolated worker will lint, compile, upload the complete static output and return a preview URL.</Typography>
            <Button variant="contained" sx={{ mt: 2 }} disabled={!studio.project.approvedRevisionId || actionBusy} onClick={() => void runBuild()}>Build approved revision</Button>
          </Card>
        )}
      </Box>
      {previewErrors.length > 0 && (
        <Box sx={{ px: 1.5, py: 1, borderTop: '1px solid var(--vm-border-subtle)', bgcolor: 'rgba(127,29,29,.15)' }}>
          <Typography sx={{ fontSize: 10, fontWeight: 800, color: '#fca5a5' }}>Preview runtime error</Typography>
          <Typography sx={{ fontSize: 9, color: '#fecaca' }}>{previewErrors.at(-1)?.message}</Typography>
        </Box>
      )}
    </Box>
  ) : mode === 'code' ? (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ px: 1.25, py: .75, borderBottom: '1px solid var(--vm-border-subtle)', display: 'flex', alignItems: 'center', gap: 1 }}>
        <FileCode2 size={14} /><Typography sx={{ fontSize: 11, fontWeight: 800, flex: 1 }}>{selectedFile?.path || 'Select a file'}</Typography>
        {selectedFile && <Chip label={languageLabel(selectedFile)} size="small" variant="outlined" sx={{ fontSize: 9 }} />}
        <Button size="small" startIcon={<Save size={13} />} disabled={!selectedFile || draft === selectedFile.currentContent || studio.saving} onClick={() => void saveFile()}>Save revision</Button>
      </Box>
      <TextField value={draft} onChange={event => setDraft(event.target.value)} multiline fullWidth minRows={25} variant="standard" InputProps={{ disableUnderline: true }}
        sx={{ flex: 1, overflow: 'auto', '& textarea': { fontFamily: '"SFMono-Regular", Consolas, monospace', fontSize: 12, lineHeight: 1.65, p: 2, tabSize: 2, color: '#d8dee9' }, '& .MuiInputBase-root': { alignItems: 'flex-start', height: '100%' } }} />
    </Box>
  ) : mode === 'spec' ? (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ px: 1.25, py: .75, borderBottom: '1px solid var(--vm-border-subtle)', display: 'flex', alignItems: 'center', gap: 1 }}>
        <Braces size={14} /><Typography sx={{ fontSize: 11, fontWeight: 800, flex: 1 }}>Structured AppSpec</Typography>
        <Button size="small" startIcon={<Save size={13} />} disabled={studio.saving} onClick={() => void saveSpec()}>Save specification</Button>
      </Box>
      <TextField value={specDraft} onChange={event => setSpecDraft(event.target.value)} multiline fullWidth minRows={25} variant="standard" InputProps={{ disableUnderline: true }}
        sx={{ flex: 1, overflow: 'auto', '& textarea': { fontFamily: '"SFMono-Regular", Consolas, monospace', fontSize: 12, lineHeight: 1.65, p: 2, color: '#d8dee9' }, '& .MuiInputBase-root': { alignItems: 'flex-start', height: '100%' } }} />
    </Box>
  ) : (
    <Box sx={{ p: 2, overflow: 'auto' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}><TerminalSquare size={18} /><Typography sx={{ fontWeight: 900 }}>Builds and diagnostics</Typography><Box sx={{ flex: 1 }} /><Button variant="contained" startIcon={<Play size={14} />} disabled={!studio.project.approvedRevisionId || actionBusy} onClick={() => void runBuild()}>New build</Button></Box>
      {studio.builds.map(build => (
        <Card key={build.id} sx={{ p: 1.5, mb: 1, bgcolor: 'rgba(255,255,255,.025)' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <Chip size="small" label={build.status} color={build.status === 'completed' ? 'success' : build.status === 'failed' ? 'error' : 'default'} />
            <Typography sx={{ fontSize: 11, fontWeight: 800, flex: 1 }}>{new Date(build.createdAt).toLocaleString()}</Typography>
            {build.previewUrl && <Button size="small" href={build.previewUrl} target="_blank" endIcon={<ExternalLink size={12} />}>Preview</Button>}
            {build.status === 'failed' && <Button size="small" color="warning" disabled={actionBusy || Boolean(studio.job && ['queued', 'running'].includes(studio.job.status))} onClick={() => void repairBuild(build.id)}>Repair with AI</Button>}
            {build.artifactStorageKey && <Button size="small" startIcon={<Download size={12} />} onClick={() => void authenticatedDownload(buildDownloadUrl(build.id), `${studio.project?.slug || 'app'}-build.zip`)}>Build ZIP</Button>}
          </Box>
          {(build.logs || build.diagnostics) && <Box component="pre" sx={{ mt: 1, p: 1.25, borderRadius: 1, bgcolor: '#05070b', fontSize: 9, whiteSpace: 'pre-wrap', maxHeight: 230, overflow: 'auto', color: build.status === 'failed' ? '#fca5a5' : '#a7f3d0' }}>{build.logs || build.diagnostics}</Box>}
        </Card>
      ))}
      {!studio.builds.length && !failedBuild && <Typography sx={{ color: 'var(--vm-text-muted)', fontSize: 12 }}>No builds yet.</Typography>}
    </Box>
  );

  return (
    <StudioChrome
      title="AI Web App Builder" subtitle="Prompt → editable React files → isolated build → live preview"
      projects={studio.projects} project={studio.project} revisions={studio.revisions} assets={studio.assets} job={studio.job}
      loading={studio.loading} saving={studio.saving} error={studio.error} pendingRevision={studio.pendingRevision}
      leftRail={leftRail} editor={editor} toolbar={toolbar}
      onSelectProject={project => void studio.selectProject(project)} onCreateProject={studio.createProject}
      onRefresh={() => void studio.load()} onGenerate={studio.generate} onApprove={studio.approve} onRollback={studio.rollback}
      onDismissError={() => studio.setError(null)} onGenerateAsset={studio.generateAsset} onExport={() => void downloadSource()} onPublish={() => void publish()}
      createLabel="Create AI web app" generationContext={generationContext} generatePlaceholder="Describe the complete website or app. Include pages, user flows, data entities, branding, forms and the outcome users should achieve."
      starterPrompts={[
        `Build a polished responsive website and client portal for ${selectedBusiness?.name || 'my business'} using the verified business profile.`,
        'Add authentication screens, a dashboard, searchable records and a responsive navigation without removing existing work.',
        'Improve the visual hierarchy, mobile layout, accessibility and conversion flow across every route.',
        'Inspect the current files and repair build errors while preserving manually edited files.',
      ]}
    />
  );
}
