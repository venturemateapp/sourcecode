import { useMemo, useState, type ReactNode } from 'react';
import {
  Alert, Box, Button, Card, Chip, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogTitle, Divider, IconButton, LinearProgress, MenuItem, Select, Tab, Tabs, TextField, Tooltip, Typography,
} from '@mui/material';
import {
  Bot, Check, Clock3, Download, History, Image, Plus, RefreshCw, Rocket, Sparkles, XCircle,
} from 'lucide-react';
import type { AIAsset, AIGenerationJob, AIProject, AIProjectRevision } from '../../lib/ai-studio/types';

interface StudioChromeProps {
  title: string;
  subtitle: string;
  projects: AIProject[];
  project: AIProject | null;
  revisions: AIProjectRevision[];
  assets: AIAsset[];
  job: AIGenerationJob | null;
  loading: boolean;
  saving: boolean;
  error: string | null;
  pendingRevision: AIProjectRevision | null;
  leftRail?: ReactNode;
  editor: ReactNode;
  toolbar?: ReactNode;
  onSelectProject: (project: AIProject) => void;
  onCreateProject: (name: string) => Promise<unknown>;
  onRefresh: () => void;
  onGenerate: (prompt: string) => Promise<unknown>;
  onApprove: (revisionId: string) => Promise<unknown>;
  onRollback: (revisionId: string) => Promise<unknown>;
  onDismissError: () => void;
  onExport?: () => void;
  onPublish?: () => void;
  generatePlaceholder: string;
  starterPrompts: string[];
  createLabel: string;
  generationContext?: string;
  onGenerateAsset?: (input: { kind: string; subject: string; purpose?: string; style?: string; size?: string; vector?: boolean; pro?: boolean }) => Promise<unknown>;
  onSelectAsset?: (asset: AIAsset) => void;
}

function jobTone(status: string): 'default' | 'primary' | 'success' | 'error' | 'warning' {
  if (status === 'failed' || status === 'cancelled') return 'error';
  if (status === 'completed') return 'success';
  if (status === 'awaiting_review') return 'warning';
  if (status === 'running') return 'primary';
  return 'default';
}

export function StudioChrome(props: StudioChromeProps) {
  const [prompt, setPrompt] = useState('');
  const [rightTab, setRightTab] = useState<'ai' | 'history' | 'assets'>('ai');
  const [createOpen, setCreateOpen] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [creating, setCreating] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [approving, setApproving] = useState(false);
  const [generatingAsset, setGeneratingAsset] = useState(false);
  const [assetSubject, setAssetSubject] = useState('');
  const [assetKind, setAssetKind] = useState('image');
  const [assetStyle, setAssetStyle] = useState('modern editorial');
  const [assetSize, setAssetSize] = useState('1024x1024');
  const isJobActive = Boolean(props.job && ['queued', 'running'].includes(props.job.status));
  const revisionCount = props.revisions.length;
  const latestApproved = useMemo(() => props.revisions.find(item => item.status === 'approved'), [props.revisions]);

  const create = async () => {
    if (!projectName.trim()) return;
    setCreating(true);
    try {
      await props.onCreateProject(projectName.trim());
      setCreateOpen(false);
      setProjectName('');
    } finally { setCreating(false); }
  };

  const generate = async () => {
    if (!prompt.trim() || isJobActive) return;
    setGenerating(true);
    try {
      const scopedPrompt = props.generationContext ? `${props.generationContext}\n\nUSER REQUEST:\n${prompt.trim()}` : prompt.trim();
      await props.onGenerate(scopedPrompt);
      setPrompt('');
    } finally { setGenerating(false); }
  };

  const approve = async () => {
    if (!props.pendingRevision) return;
    setApproving(true);
    try { await props.onApprove(props.pendingRevision.id); } finally { setApproving(false); }
  };

  const generateAsset = async () => {
    if (!props.onGenerateAsset || !assetSubject.trim() || isJobActive) return;
    setGeneratingAsset(true);
    try {
      await props.onGenerateAsset({
        kind: assetKind, subject: assetSubject.trim(), purpose: `Asset for ${props.title}`,
        style: assetStyle.trim(), size: assetSize, vector: ['vector', 'logo', 'icon'].includes(assetKind),
      });
      setAssetSubject('');
    } finally { setGeneratingAsset(false); }
  };

  return (
    <Box sx={{ height: { xs: 'auto', lg: 'calc(100vh - 92px)' }, minHeight: 620, display: 'flex', flexDirection: 'column', bgcolor: '#070a10' }}>
      <Box sx={{ px: { xs: 1.25, md: 2 }, py: 1.25, borderBottom: '1px solid var(--vm-border-subtle)', display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', bgcolor: 'rgba(10,14,22,.96)' }}>
        <Box sx={{ minWidth: 190, mr: 1 }}>
          <Typography sx={{ fontWeight: 900, color: 'var(--vm-text-primary)', fontSize: 17 }}>{props.title}</Typography>
          <Typography sx={{ color: 'var(--vm-text-muted)', fontSize: 10 }}>{props.subtitle}</Typography>
        </Box>
        <Select
          size="small" value={props.project?.id || ''} displayEmpty
          onChange={(event) => { const target = props.projects.find(item => item.id === event.target.value); if (target) props.onSelectProject(target); }}
          sx={{ minWidth: 220, bgcolor: 'rgba(255,255,255,.03)', fontSize: 12 }}
        >
          {!props.projects.length && <MenuItem value="" disabled>No projects yet</MenuItem>}
          {props.projects.map(item => <MenuItem key={item.id} value={item.id}>{item.name}</MenuItem>)}
        </Select>
        <Tooltip title={props.createLabel}><IconButton onClick={() => setCreateOpen(true)} size="small"><Plus size={17} /></IconButton></Tooltip>
        <Tooltip title="Refresh project"><IconButton onClick={props.onRefresh} disabled={props.loading} size="small"><RefreshCw size={16} /></IconButton></Tooltip>
        {props.project && <Chip size="small" label={props.project.status} color={props.project.status === 'published' ? 'success' : 'default'} variant="outlined" sx={{ fontSize: 10 }} />}
        <Box sx={{ flex: 1 }} />
        {props.pendingRevision && (
          <Button size="small" variant="contained" color="success" startIcon={approving ? <CircularProgress size={13} /> : <Check size={15} />} onClick={() => void approve()} disabled={approving || props.saving}>
            Approve AI revision
          </Button>
        )}
        {props.toolbar}
        {props.onExport && <Button size="small" variant="outlined" startIcon={<Download size={14} />} onClick={props.onExport}>Export</Button>}
        {props.onPublish && <Button size="small" variant="contained" startIcon={<Rocket size={14} />} onClick={props.onPublish}>Publish</Button>}
      </Box>

      {props.error && <Alert severity="error" onClose={props.onDismissError} sx={{ borderRadius: 0 }}>{props.error}</Alert>}
      {props.job && isJobActive && <LinearProgress variant="determinate" value={Math.max(2, props.job.progress || 2)} />}

      <Box sx={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: { xs: '1fr', lg: `${props.leftRail ? '230px ' : ''}minmax(0,1fr) 330px` } }}>
        {props.leftRail && <Box sx={{ borderRight: '1px solid var(--vm-border-subtle)', minHeight: 0, overflow: 'auto', bgcolor: '#0b0f17' }}>{props.leftRail}</Box>}
        <Box sx={{ minWidth: 0, minHeight: 0, overflow: 'auto', bgcolor: '#080c13' }}>{props.loading ? <Box sx={{ height: '100%', display: 'grid', placeItems: 'center' }}><CircularProgress /></Box> : props.editor}</Box>

        <Box sx={{ borderLeft: '1px solid var(--vm-border-subtle)', minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', bgcolor: '#0b0f17' }}>
          <Tabs value={rightTab} onChange={(_, value) => setRightTab(value)} variant="fullWidth" sx={{ minHeight: 42, borderBottom: '1px solid var(--vm-border-subtle)', '& .MuiTab-root': { minHeight: 42, fontSize: 10 } }}>
            <Tab value="ai" icon={<Bot size={14} />} iconPosition="start" label="AI" />
            <Tab value="history" icon={<History size={14} />} iconPosition="start" label={`History ${revisionCount}`} />
            <Tab value="assets" icon={<Image size={14} />} iconPosition="start" label={`Assets ${props.assets.length}`} />
          </Tabs>

          {rightTab === 'ai' && (
            <Box sx={{ p: 1.5, display: 'flex', flexDirection: 'column', gap: 1.25, minHeight: 0, flex: 1 }}>
              <Card sx={{ p: 1.25, bgcolor: 'rgba(124,58,237,.08)', border: '1px solid rgba(124,58,237,.22)' }}>
                <Typography sx={{ fontSize: 12, fontWeight: 800, display: 'flex', alignItems: 'center', gap: .75 }}><Sparkles size={14} /> DeepSeek AI workspace</Typography>
                <Typography sx={{ fontSize: 10, color: 'var(--vm-text-muted)', mt: .5 }}>AI creates a reviewable revision. Nothing replaces your approved work until you approve it.</Typography>
              </Card>
              {props.job && (
                <Card sx={{ p: 1.25, bgcolor: 'rgba(255,255,255,.025)' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: .75 }}>
                    <Chip size="small" label={props.job.status.replaceAll('_', ' ')} color={jobTone(props.job.status)} sx={{ fontSize: 9 }} />
                    <Typography sx={{ fontSize: 10, color: 'var(--vm-text-muted)' }}>{props.job.progress}%</Typography>
                  </Box>
                  <Typography sx={{ fontSize: 12, fontWeight: 700, mt: 1 }}>{props.job.message || props.job.step}</Typography>
                  {props.job.errorMessage && <Typography sx={{ fontSize: 10, color: 'error.main', mt: .75 }}>{props.job.errorMessage}</Typography>}
                  {(props.job.provider || props.job.model) && <Typography sx={{ fontSize: 9, color: 'var(--vm-text-muted)', mt: .75 }}>{props.job.provider} · {props.job.model} · {(props.job.inputTokens || 0) + (props.job.outputTokens || 0)} tokens</Typography>}
                </Card>
              )}
              {props.generationContext && (
                <Card sx={{ p: 1, bgcolor: 'rgba(14,165,233,.07)', border: '1px solid rgba(14,165,233,.18)' }}>
                  <Typography sx={{ fontSize: 9, fontWeight: 800, color: '#7dd3fc' }}>SELECTED PREVIEW ELEMENT</Typography>
                  <Typography sx={{ mt: .4, fontSize: 9, color: 'var(--vm-text-muted)', whiteSpace: 'pre-wrap' }}>{props.generationContext}</Typography>
                </Card>
              )}
              <TextField
                multiline minRows={5} maxRows={10} value={prompt} onChange={event => setPrompt(event.target.value)}
                placeholder={props.generatePlaceholder}
                onKeyDown={event => { if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) { event.preventDefault(); void generate(); } }}
                sx={{ '& .MuiOutlinedInput-root': { alignItems: 'flex-start', bgcolor: 'rgba(0,0,0,.18)' } }}
              />
              <Button fullWidth variant="contained" startIcon={generating || isJobActive ? <CircularProgress size={14} /> : <Sparkles size={15} />} disabled={!props.project || !prompt.trim() || generating || isJobActive} onClick={() => void generate()}>
                {isJobActive ? 'AI is working…' : 'Generate reviewable revision'}
              </Button>
              <Typography sx={{ fontSize: 9, color: 'var(--vm-text-muted)', textAlign: 'center' }}>Ctrl/Cmd + Enter to generate</Typography>
              <Divider />
              <Typography sx={{ fontSize: 10, color: 'var(--vm-text-muted)', fontWeight: 700 }}>STARTING PROMPTS</Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: .75, overflow: 'auto' }}>
                {props.starterPrompts.map(item => <Button key={item} variant="text" onClick={() => setPrompt(item)} sx={{ justifyContent: 'flex-start', textAlign: 'left', fontSize: 10, color: 'var(--vm-text-secondary)', px: 1 }}>{item}</Button>)}
              </Box>
            </Box>
          )}

          {rightTab === 'history' && (
            <Box sx={{ p: 1, overflow: 'auto' }}>
              {props.revisions.map(revision => (
                <Card key={revision.id} sx={{ p: 1.25, mb: 1, bgcolor: 'rgba(255,255,255,.025)' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: .75 }}>
                    {revision.status === 'approved' ? <Check size={13} color="#22c55e" /> : revision.status === 'ready' ? <Clock3 size={13} color="#f59e0b" /> : <XCircle size={13} />}
                    <Typography sx={{ fontSize: 11, fontWeight: 800, flex: 1 }}>{revision.summary || revision.source}</Typography>
                  </Box>
                  <Typography sx={{ fontSize: 9, color: 'var(--vm-text-muted)', mt: .5 }}>{new Date(revision.createdAt).toLocaleString()}</Typography>
                  <Box sx={{ display: 'flex', gap: .5, mt: 1 }}>
                    {revision.status === 'ready' && <Button size="small" onClick={() => void props.onApprove(revision.id)} sx={{ fontSize: 9 }}>Approve</Button>}
                    {latestApproved?.id !== revision.id && <Button size="small" color="inherit" onClick={() => void props.onRollback(revision.id)} sx={{ fontSize: 9 }}>Restore</Button>}
                  </Box>
                </Card>
              ))}
              {!props.revisions.length && <Typography sx={{ p: 2, fontSize: 11, color: 'var(--vm-text-muted)' }}>No revisions yet.</Typography>}
            </Box>
          )}

          {rightTab === 'assets' && (
            <Box sx={{ p: 1, overflow: 'auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
              {props.onGenerateAsset && (
                <Card sx={{ gridColumn: '1 / -1', p: 1.25, bgcolor: 'rgba(124,58,237,.07)', border: '1px solid rgba(124,58,237,.2)' }}>
                  <Typography sx={{ fontSize: 11, fontWeight: 850, mb: 1 }}>Generate a durable Recraft asset</Typography>
                  <TextField fullWidth size="small" label="What should the visual show?" value={assetSubject} onChange={event => setAssetSubject(event.target.value)} multiline minRows={2} />
                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: .75, mt: .75 }}>
                    <Select size="small" value={assetKind} onChange={event => setAssetKind(event.target.value)}>
                      {['image', 'background', 'mockup', 'chart', 'logo', 'icon', 'vector'].map(kind => <MenuItem key={kind} value={kind}>{kind}</MenuItem>)}
                    </Select>
                    <Select size="small" value={assetSize} onChange={event => setAssetSize(event.target.value)}>
                      {['1024x1024', '1365x768', '768x1365'].map(size => <MenuItem key={size} value={size}>{size}</MenuItem>)}
                    </Select>
                  </Box>
                  <TextField fullWidth size="small" label="Visual style" value={assetStyle} onChange={event => setAssetStyle(event.target.value)} sx={{ mt: .75 }} />
                  <Button fullWidth variant="contained" sx={{ mt: 1 }} disabled={!props.project || !assetSubject.trim() || generatingAsset || isJobActive} onClick={() => void generateAsset()} startIcon={generatingAsset ? <CircularProgress size={13} /> : <Sparkles size={14} />}>Generate with Recraft</Button>
                </Card>
              )}
              {props.assets.map(asset => (
                <Card key={asset.id} onClick={() => props.onSelectAsset?.(asset)} sx={{ overflow: 'hidden', bgcolor: 'rgba(255,255,255,.025)', cursor: props.onSelectAsset ? 'pointer' : 'default' }}>
                  <Box component="img" src={asset.thumbnailUrl || asset.url} alt={asset.prompt} sx={{ width: '100%', aspectRatio: '1.3', objectFit: 'cover', display: 'block' }} />
                  <Box sx={{ p: .75 }}><Typography sx={{ fontSize: 9, fontWeight: 700 }} noWrap>{asset.kind}</Typography><Typography sx={{ fontSize: 8, color: 'var(--vm-text-muted)' }} noWrap>{asset.model}</Typography>{props.onSelectAsset && <Typography sx={{ mt: .35, fontSize: 8, color: '#a78bfa' }}>Click to insert</Typography>}</Box>
                </Card>
              ))}
              {!props.assets.length && <Typography sx={{ gridColumn: '1 / -1', p: 2, fontSize: 11, color: 'var(--vm-text-muted)' }}>Generated Recraft assets will appear here.</Typography>}
            </Box>
          )}
        </Box>
      </Box>

      <Dialog open={createOpen} onClose={() => !creating && setCreateOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{props.createLabel}</DialogTitle>
        <DialogContent><TextField autoFocus fullWidth label="Project name" value={projectName} onChange={event => setProjectName(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') void create(); }} sx={{ mt: 1 }} /></DialogContent>
        <DialogActions><Button onClick={() => setCreateOpen(false)} disabled={creating}>Cancel</Button><Button variant="contained" onClick={() => void create()} disabled={!projectName.trim() || creating} startIcon={creating ? <CircularProgress size={14} /> : <Plus size={14} />}>Create</Button></DialogActions>
      </Dialog>
    </Box>
  );
}
