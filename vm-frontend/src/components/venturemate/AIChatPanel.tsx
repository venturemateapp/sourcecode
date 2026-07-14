import { useEffect, useMemo, useRef, useState, type ChangeEvent, type KeyboardEvent } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  IconButton,
  TextField,
  Typography,
} from '@mui/material';
import {
  Bot,
  Check,
  File as FileIcon,
  Image as ImageIcon,
  Paperclip,
  Send,
  Sparkles,
  X,
} from 'lucide-react';
import type { ProposedChange } from './AICreationStudio';
import { useBusiness } from '../../contexts/BusinessContext';
import { useAIProvider } from '../../contexts/AIProviderContext';
import { graphqlRequest, uploadFile } from '../../lib/api';

interface Attachment {
  id: string;
  name: string;
  type: 'image' | 'document' | 'file';
  size: string;
  url?: string;
}

interface AgentOperation {
  tool: string;
  success: boolean;
  result: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  operations?: AgentOperation[];
  attachments?: Attachment[];
}

interface AgentResponse {
  executeAgentQuery: {
    message: string;
    operations?: AgentOperation[];
  };
}

interface ProposalResponse {
  proposeAgentAction: {
    message: string;
    proposals: ProposedChange[];
  };
}

interface ApplyResponse {
  applyAgentProposal: { success: boolean; message: string };
}

interface PendingCreativeProposal {
  domain: 'branding' | 'website' | 'business-plan' | 'pitch-deck';
  change: ProposedChange;
}

interface AIChatPanelProps {
  domain: string;
  placeholder?: string;
  mode?: 'floating' | 'page';
}

const EXECUTE_AGENT_MUTATION = `
  mutation ExecuteAgentQuery(
    $userId: ID!
    $businessId: ID!
    $prompt: String!
    $domain: String
    $history: String
  ) {
    executeAgentQuery(
      userId: $userId
      businessId: $businessId
      prompt: $prompt
      domain: $domain
      history: $history
    ) {
      message
      operations {
        tool
        success
        result
      }
    }
  }
`;

const PROPOSE_MUTATION = `
  mutation ProposeAgentAction($userId: ID!, $businessId: ID!, $prompt: String!, $domain: String) {
    proposeAgentAction(userId: $userId, businessId: $businessId, prompt: $prompt, domain: $domain) {
      message
      proposals { id type field domain summary currentValue newValue }
    }
  }
`;

const APPLY_MUTATION = `
  mutation ApplyAgentProposal($userId: ID!, $businessId: ID!, $changes: String!) {
    applyAgentProposal(userId: $userId, businessId: $businessId, changes: $changes) { success message }
  }
`;

const QUICK_ACTIONS = [
  'Summarize this module',
  'Suggest the next best action',
  'Show the current business details',
  'Help me update this module',
];

function displayDomain(domain: string) {
  return domain.replace(/-/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase());
}

function detectCreativeDomain(currentDomain: string, prompt: string): PendingCreativeProposal['domain'] | null {
  const normalizedDomain = currentDomain.toLowerCase().replace(/[_ ]/g, '-');
  const value = prompt.toLowerCase();
  const isWebsiteOperation = /\b(publish|republish|deploy|go live|take (?:the )?site offline|unpublish|connect (?:a |my )?(?:custom )?domain|verify (?:the |my )?domain|domain verification|remove (?:the )?custom domain|delete (?:the )?website)\b/.test(value);
  const alsoRequestsDesign = /\b(generate|create|design|redesign|build)\b/.test(value)
    || /\b(rewrite|change|edit|add|remove|make)\b.{0,50}\b(section|page|hero|carousel|layout|copy|website design)\b/.test(value);
  if (isWebsiteOperation && !alsoRequestsDesign) return null;
  if (['branding', 'brand', 'brand-kit', 'branding-kit', 'logo'].includes(normalizedDomain)) return 'branding';
  if (['website', 'website-builder', 'site'].includes(normalizedDomain)) return 'website';
  if (['business-plan', 'businessplan', 'plan'].includes(normalizedDomain)) return 'business-plan';
  if (['pitch-deck', 'pitchdeck', 'deck'].includes(normalizedDomain)) return 'pitch-deck';

  if (/\b(business plan|business-plan)\b/.test(value)) return 'business-plan';
  if (/\b(pitch deck|investor deck|slide deck|pitch slides|presentation deck)\b/.test(value)) return 'pitch-deck';
  if (/\b(logo|brand kit|brand identity|branding|colour palette|color palette)\b/.test(value)) return 'branding';
  if (/\b(website|web site|landing page|homepage|home page|site design|website section|web page|carousel)\b/.test(value)) return 'website';
  return null;
}

function safeObject(value: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' ? parsed as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

function CreativeProposalPreview({ proposal }: { proposal: PendingCreativeProposal }) {
  const value = safeObject(proposal.change.newValue);
  if (proposal.domain === 'branding') {
    const concept = value.logoConcept && typeof value.logoConcept === 'object' ? value.logoConcept as Record<string, unknown> : {};
    const colors = ['primaryColor', 'secondaryColor', 'accentColor', 'darkColor'].map(key => String(value[key] || '')).filter(Boolean);
    return (
      <Box sx={{ display: 'flex', gap: 1.25, alignItems: 'center', flexWrap: 'wrap' }}>
        {typeof value.logo === 'string' && value.logo && <Box component="img" src={value.logo} alt="AI logo proposal" sx={{ width: 72, height: 72, objectFit: 'contain', borderRadius: 2, bgcolor: 'rgba(255,255,255,.07)' }} />}
        <Box sx={{ flex: 1, minWidth: 180 }}>
          <Typography sx={{ color: 'var(--vm-text-primary)', fontSize: 13, fontWeight: 900 }}>{String(concept.style || 'AI-designed')} logo concept</Typography>
          <Typography sx={{ color: 'var(--vm-text-muted)', fontSize: 11, mt: .35 }}>{String(concept.rationale || proposal.change.summary)}</Typography>
          <Box sx={{ display: 'flex', gap: .6, mt: .8 }}>{colors.map(color => <Box key={color} title={color} sx={{ width: 24, height: 24, borderRadius: 999, bgcolor: color, border: '1px solid rgba(255,255,255,.24)' }} />)}</Box>
        </Box>
      </Box>
    );
  }
  if (proposal.domain === 'business-plan') {
    const sections = Array.isArray(value.sections) ? value.sections : [];
    return <Box><Typography sx={{ color: 'var(--vm-text-primary)', fontWeight: 900 }}>{String(value.title || 'Business Plan')}</Typography><Typography sx={{ color: 'var(--vm-text-muted)', fontSize: 11 }}>{sections.length} sections · {String(value.version || 'new version')}</Typography><Typography sx={{ color: 'var(--vm-text-secondary)', fontSize: 12, mt: .8, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{String(value.executiveSummary || proposal.change.summary)}</Typography></Box>;
  }
  if (proposal.domain === 'pitch-deck') {
    const slides = Array.isArray(value.slides) ? value.slides : [];
    return <Box><Typography sx={{ color: 'var(--vm-text-primary)', fontWeight: 900 }}>{String(value.title || 'Pitch Deck')}</Typography><Typography sx={{ color: 'var(--vm-text-muted)', fontSize: 11 }}>{slides.length} AI-designed slides</Typography><Box sx={{ display: 'flex', gap: .6, mt: 1, overflow: 'hidden' }}>{slides.slice(0, 4).map((slide, index) => { const item = slide && typeof slide === 'object' ? slide as Record<string, unknown> : {}; return <Box key={index} sx={{ minWidth: 76, aspectRatio: '16/9', p: .7, borderRadius: 1, bgcolor: 'var(--vm-bg-primary)', border: '1px solid var(--vm-border-subtle)', color: 'var(--vm-text-secondary)', fontSize: 8, overflow: 'hidden' }}>{String(item.title || `Slide ${index + 1}`)}</Box>; })}</Box></Box>;
  }
  const pages = Array.isArray(value.pages) ? value.pages : [];
  const sectionCount = pages.reduce((count, page) => count + (page && typeof page === 'object' && Array.isArray((page as Record<string, unknown>).sections) ? ((page as Record<string, unknown>).sections as unknown[]).length : 0), 0);
  return <Box><Typography sx={{ color: 'var(--vm-text-primary)', fontWeight: 900 }}>Private website draft</Typography><Typography sx={{ color: 'var(--vm-text-muted)', fontSize: 11 }}>{pages.length} pages · {sectionCount} sections · saved only after approval</Typography><Typography sx={{ color: 'var(--vm-text-secondary)', fontSize: 12, mt: .75 }}>{proposal.change.summary}</Typography></Box>;
}

export function AIChatPanel({ domain, placeholder, mode = 'floating' }: AIChatPanelProps) {
  const { selectedBusiness, userId, refreshBusiness } = useBusiness();
  const [open, setOpen] = useState(mode === 'page');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [applyingProposal, setApplyingProposal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [pendingProposal, setPendingProposal] = useState<PendingCreativeProposal | null>(null);
  const fileStoreRef = useRef<Map<string, File>>(new Map());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    setMessages([]);
    setError(null);
    setPendingProposal(null);
  }, [selectedBusiness?.id, domain]);

  const history = useMemo(
    () => JSON.stringify(messages.slice(-16).map(message => ({ role: message.role, content: message.content }))),
    [messages],
  );

  const handleFileSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;
    Array.from(files).forEach(file => {
      const id = `${Date.now()}-${Math.random()}`;
      const type: Attachment['type'] = file.type.startsWith('image/')
        ? 'image'
        : file.type.includes('pdf') || file.type.includes('document') || file.type.includes('text')
          ? 'document'
          : 'file';
      fileStoreRef.current.set(id, file);
      setAttachments(current => [...current, {
        id,
        name: file.name,
        type,
        size: `${Math.max(1, Math.round(file.size / 1024))} KB`,
        url: type === 'image' ? URL.createObjectURL(file) : undefined,
      }]);
    });
    event.target.value = '';
  };

  const removeAttachment = (id: string) => {
    const attachment = attachments.find(item => item.id === id);
    if (attachment?.url) URL.revokeObjectURL(attachment.url);
    fileStoreRef.current.delete(id);
    setAttachments(current => current.filter(item => item.id !== id));
  };

  const handleSend = async (forcedPrompt?: string) => {
    const rawPrompt = (forcedPrompt ?? input).trim();
    if ((!rawPrompt && attachments.length === 0) || !selectedBusiness || !userId || loading) return;

    if (pendingProposal && /\b(approve|approved|accept|use this|save this|apply this|looks good|go with this)\b/i.test(rawPrompt)) {
      const publishAfterApproval = pendingProposal.domain === 'website'
        && /\b(publish|republish|deploy|go live|make (?:it|the site) live)\b/i.test(rawPrompt);
      setMessages(current => [...current, { id: `${Date.now()}-user`, role: 'user', content: rawPrompt }]);
      setInput('');
      await approveCreativeProposal(publishAfterApproval ? rawPrompt : undefined);
      return;
    }
    if (pendingProposal && /\b(discard|reject|cancel this|do not use|don['’]?t use)\b/i.test(rawPrompt)) {
      setMessages(current => [...current, { id: `${Date.now()}-user`, role: 'user', content: rawPrompt }, { id: `${Date.now()}-assistant`, role: 'assistant', content: 'Discarded. The approved version was not changed.' }]);
      setPendingProposal(null);
      setInput('');
      return;
    }

    setLoading(true);
    setError(null);
    let prompt = rawPrompt;
    const uploaded: Attachment[] = [];

    try {
      for (const attachment of attachments) {
        const file = fileStoreRef.current.get(attachment.id);
        if (!file) continue;
        const result = await uploadFile(file, selectedBusiness.id, 'other', domain);
        uploaded.push({
          id: result.document.id,
          name: result.document.name,
          type: result.document.type === 'image' ? 'image' : 'document',
          size: result.document.size,
          url: result.document.url,
        });
      }

      if (uploaded.length > 0) {
        prompt += `\n\nThe user attached these uploaded files:\n${uploaded.map(file => `- ${file.name} (documentId: ${file.id}): ${file.url || 'uploaded'}`).join('\n')}`;
      }

      const userMessage: ChatMessage = {
        id: `${Date.now()}-user`,
        role: 'user',
        content: rawPrompt || 'Please inspect the attached file(s).',
        attachments: uploaded.length > 0 ? uploaded : attachments,
      };
      setMessages(current => [...current, userMessage]);
      setInput('');
      setAttachments([]);
      fileStoreRef.current.clear();

      const creativeDomain = pendingProposal?.domain || detectCreativeDomain(domain, prompt);
      if (creativeDomain) {
        const creativePrompt = pendingProposal
          ? `${prompt}\n\nRevise the pending ${creativeDomain} proposal below. Preserve everything I did not ask to change.\nPending proposal JSON:\n${pendingProposal.change.newValue}`
          : prompt;
        const data = await graphqlRequest<ProposalResponse>(PROPOSE_MUTATION, {
          userId,
          businessId: selectedBusiness.id,
          prompt: creativePrompt,
          domain: creativeDomain,
        });
        const response = data.proposeAgentAction;
        const proposal = response.proposals?.[0];
        if (!proposal) throw new Error('AI did not return a reviewable creative proposal.');
        setPendingProposal({ domain: creativeDomain, change: proposal });
        setMessages(current => [...current, {
          id: `${Date.now()}-assistant`,
          role: 'assistant',
          content: response.message || 'I prepared a version for your review. Tell me what to adjust, ask for another option, or approve it.',
        }]);
      } else {
        const data = await graphqlRequest<AgentResponse>(EXECUTE_AGENT_MUTATION, {
          userId,
          businessId: selectedBusiness.id,
          prompt,
          domain,
          history,
        });

        const response = data.executeAgentQuery;
        setMessages(current => [...current, {
          id: `${Date.now()}-assistant`,
          role: 'assistant',
          content: response.message,
          operations: response.operations || [],
        }]);

        if ((response.operations || []).some(operation => operation.success)) {
          await refreshBusiness();
          window.dispatchEvent(new CustomEvent('venturemate:ai-data-changed', {
            detail: { businessId: selectedBusiness.id, domain },
          }));
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'The AI request failed.';
      setError(message);
      setMessages(current => [...current, {
        id: `${Date.now()}-assistant-error`,
        role: 'assistant',
        content: `I could not complete that request. ${message}`,
      }]);
    } finally {
      setLoading(false);
    }
  };

  async function approveCreativeProposal(publishAfterPrompt?: string) {
    if (!pendingProposal || !selectedBusiness || !userId || applyingProposal) return;
    setApplyingProposal(true);
    setError(null);
    try {
      const data = await graphqlRequest<ApplyResponse>(APPLY_MUTATION, {
        userId,
        businessId: selectedBusiness.id,
        changes: JSON.stringify([pendingProposal.change]),
      });
      if (!data.applyAgentProposal.success) throw new Error(data.applyAgentProposal.message || 'Could not approve this version.');
      const approvedDomain = pendingProposal.domain;
      setPendingProposal(null);
      setMessages(current => [...current, {
        id: `${Date.now()}-assistant-approved`,
        role: 'assistant',
        content: `${data.applyAgentProposal.message || 'Approved and saved.'}${approvedDomain === 'website' ? (publishAfterPrompt ? ' I am publishing this approved draft now.' : ' The website remains a private draft until you explicitly ask me to publish it.') : ''}`,
      }]);
      await refreshBusiness();
      window.dispatchEvent(new CustomEvent('venturemate:ai-data-changed', {
        detail: { businessId: selectedBusiness.id, domain: approvedDomain },
      }));

      if (approvedDomain === 'website' && publishAfterPrompt) {
        const publishData = await graphqlRequest<AgentResponse>(EXECUTE_AGENT_MUTATION, {
          userId,
          businessId: selectedBusiness.id,
          prompt: `${publishAfterPrompt}\n\nThe user explicitly approved this exact website proposal and explicitly requested publication in the same message. Publish the newly approved draft now.`,
          domain: 'website',
          history,
        });
        const publishResult = publishData.executeAgentQuery;
        setMessages(current => [...current, {
          id: `${Date.now()}-assistant-published`,
          role: 'assistant',
          content: publishResult.message,
          operations: publishResult.operations || [],
        }]);
        if ((publishResult.operations || []).some(operation => operation.success)) {
          await refreshBusiness();
          window.dispatchEvent(new CustomEvent('venturemate:ai-data-changed', {
            detail: { businessId: selectedBusiness.id, domain: 'website' },
          }));
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not approve this proposal.');
    } finally {
      setApplyingProposal(false);
    }
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void handleSend();
    }
  };

  if (!selectedBusiness) return null;

  const panel = (
    <Box
      sx={{
        width: mode === 'floating' ? { xs: '100%', sm: 430 } : '100%',
        height: mode === 'floating' ? { xs: '76vh', sm: 590 } : 'calc(100vh - 180px)',
        minHeight: mode === 'page' ? 520 : undefined,
        borderRadius: mode === 'floating' ? { xs: 2.5, sm: 3 } : 3,
        bgcolor: 'var(--vm-bg-primary)',
        border: '1px solid var(--vm-border-subtle)',
        boxShadow: mode === 'floating' ? '0 20px 70px rgba(0,0,0,0.42)' : 'none',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <Box sx={{ p: 1.5, borderBottom: '1px solid var(--vm-border-subtle)', bgcolor: 'var(--vm-bg-secondary)' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
          <Avatar sx={{ width: 36, height: 36, bgcolor: 'var(--vm-primary-600)' }}>
            <Bot size={20} />
          </Avatar>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography sx={{ fontSize: 14, fontWeight: 800, color: 'var(--vm-text-primary)' }}>
              VentureMate AI
            </Typography>
            <Typography sx={{ fontSize: 11, color: 'var(--vm-text-muted)' }} noWrap>
              {selectedBusiness.name}
            </Typography>
          </Box>
          {mode === 'floating' && (
            <IconButton size="small" onClick={() => setOpen(false)} aria-label="Close AI assistant">
              <X size={18} />
            </IconButton>
          )}
        </Box>
      </Box>

      <Box sx={{ flex: 1, overflowY: 'auto', p: 1.5 }}>
        {messages.length === 0 && (
          <Box sx={{ py: 3, textAlign: 'center' }}>
            <Sparkles size={30} color="var(--vm-primary-400)" />
            <Typography sx={{ mt: 1, fontWeight: 700, color: 'var(--vm-text-primary)' }}>
              Ask me to work in {displayDomain(domain)}
            </Typography>
            <Typography sx={{ mt: 0.5, mb: 2, px: 2, fontSize: 12, color: 'var(--vm-text-muted)' }}>
              I can read module data, create or update records, build websites, generate a local SVG logo, and carry out confirmed destructive actions.
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 0.75, maxWidth: '100%', alignItems: 'flex-start' }}>
              {QUICK_ACTIONS.map(action => (
                <Chip key={action} size="small" label={action} onClick={() => setInput(action)} sx={{ maxWidth: '100%', minWidth: 0, flexShrink: 1, height: 'auto', '& .MuiChip-label': { whiteSpace: 'normal', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, wordBreak: 'break-word', py: 0.5, lineHeight: 1.4 } }} />
              ))}
            </Box>
          </Box>
        )}

        {messages.map(message => (
          <Box key={message.id} sx={{ display: 'flex', justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start', mb: 1.5 }}>
            <Box
              sx={{
                maxWidth: '88%',
                p: 1.25,
                borderRadius: 2.5,
                bgcolor: message.role === 'user' ? 'var(--vm-primary-600)' : 'var(--vm-bg-secondary)',
                color: message.role === 'user' ? 'white' : 'var(--vm-text-primary)',
                border: message.role === 'assistant' ? '1px solid var(--vm-border-subtle)' : 'none',
              }}
            >
              <Typography sx={{ fontSize: 13, whiteSpace: 'pre-wrap', lineHeight: 1.55, overflowWrap: 'anywhere' }}>
                {message.content}
              </Typography>
              {message.attachments && message.attachments.length > 0 && (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mt: 1, maxWidth: '100%' }}>
                  {message.attachments.map(file => (
                    <Chip key={file.id} size="small" icon={file.type === 'image' ? <ImageIcon size={13} /> : <FileIcon size={13} />} label={file.name} sx={{ maxWidth: '100%', minWidth: 0, flexShrink: 1, height: 'auto', '& .MuiChip-label': { whiteSpace: 'normal', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, wordBreak: 'break-word', py: 0.5, lineHeight: 1.4 } }} />
                  ))}
                </Box>
              )}
              {message.operations && message.operations.length > 0 && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mt: 1 }}>
                  {message.operations.map((operation, index) => (
                    <Chip
                      key={`${operation.tool}-${index}`}
                      size="small"
                      color={operation.success ? 'success' : 'warning'}
                      variant="outlined"
                      label={`${operation.success ? 'Completed' : 'Needs attention'}: ${operation.tool}`}
                      sx={{ justifyContent: 'flex-start', maxWidth: '100%', minWidth: 0, flexShrink: 1, height: 'auto', '& .MuiChip-label': { whiteSpace: 'normal', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, wordBreak: 'break-word', py: 0.5, lineHeight: 1.4 } }}
                    />
                  ))}
                </Box>
              )}
            </Box>
          </Box>
        ))}
        {pendingProposal && (
          <Card sx={{ p: 1.4, mb: 1.5, bgcolor: 'var(--vm-bg-secondary)', border: '1px solid var(--vm-primary-600)', borderRadius: 2.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: .8, mb: 1 }}>
              <Sparkles size={15} color="var(--vm-primary-400)" />
              <Typography sx={{ color: 'var(--vm-text-primary)', fontSize: 12, fontWeight: 900, flex: 1 }}>AI proposal · not saved</Typography>
              <Chip label={displayDomain(pendingProposal.domain)} size="small" variant="outlined" sx={{ fontSize: 9 }} />
            </Box>
            <CreativeProposalPreview proposal={pendingProposal} />
            <Typography sx={{ color: 'var(--vm-text-muted)', fontSize: 10.5, mt: 1.1 }}>
              Type a revision below, request another option, or approve this exact version.
            </Typography>
            <Box sx={{ display: 'flex', gap: .7, flexWrap: 'wrap', mt: 1.1 }}>
              <Button size="small" variant="contained" color="success" startIcon={applyingProposal ? <CircularProgress size={13} /> : <Check size={14} />} disabled={loading || applyingProposal} onClick={() => void approveCreativeProposal()}>
                Approve
              </Button>
              <Button size="small" variant="outlined" startIcon={<RefreshCw size={13} />} disabled={loading || applyingProposal} onClick={() => void handleSend(`Show me a distinctly different ${pendingProposal.domain} option that still fits my approved business information.`)}>
                Another option
              </Button>
              <Button size="small" variant="text" startIcon={<X size={13} />} disabled={applyingProposal} onClick={() => setPendingProposal(null)}>
                Discard
              </Button>
            </Box>
          </Card>
        )}
        {loading && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'var(--vm-text-muted)', p: 1 }}>
            <CircularProgress size={16} />
            <Typography sx={{ fontSize: 12 }}>Working on your request…</Typography>
          </Box>
        )}
        <div ref={messagesEndRef} />
      </Box>

      {error && <Alert severity="error" onClose={() => setError(null)} sx={{ mx: 1.5, mb: 1 }}>{error}</Alert>}

      {attachments.length > 0 && (
        <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', px: 1.5, pb: 1 }}>
          {attachments.map(file => (
            <Chip key={file.id} size="small" label={`${file.name} · ${file.size}`} onDelete={() => removeAttachment(file.id)} />
          ))}
        </Box>
      )}

      <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 0.75, p: 1.25, borderTop: '1px solid var(--vm-border-subtle)' }}>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,.pdf,.doc,.docx,.txt,.csv,.xls,.xlsx"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />
        <Tooltip title="Attach files">
          <IconButton onClick={() => fileInputRef.current?.click()} disabled={loading}>
            <Paperclip size={19} />
          </IconButton>
        </Tooltip>
        <TextField
          fullWidth
          multiline
          maxRows={4}
          value={input}
          onChange={(event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setInput(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || `Ask AI to work in ${displayDomain(domain)}…`}
          disabled={loading}
          sx={{
            '& .MuiOutlinedInput-root': { bgcolor: 'var(--vm-bg-secondary)', fontSize: 13 },
            '& .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--vm-border-subtle)' },
          }}
        />
        <Button
          variant="contained"
          onClick={() => void handleSend()}
          disabled={loading || (!input.trim() && attachments.length === 0)}
          sx={{ minWidth: 44, width: 44, height: 44, p: 0, borderRadius: 2 }}
          aria-label="Send to AI"
        >
          <Send size={18} />
        </Button>
      </Box>
    </Box>
  );

  if (mode === 'page') return panel;

  return (
    <Box
      sx={{
        position: 'fixed',
        right: { xs: 0, sm: 24 },
        bottom: { xs: 0, sm: 24 },
        left: { xs: 0, sm: 'auto' },
        zIndex: 1400,
        p: { xs: 1, sm: 0 },
      }}
    >
      {open ? panel : (
        <Button
          variant="contained"
          onClick={() => setOpen(true)}
          startIcon={<Bot size={20} />}
          sx={{
            borderRadius: 999,
            px: 2.5,
            py: 1.3,
            boxShadow: '0 0 24px rgba(16, 185, 129, 0.35)',
            textTransform: 'none',
            fontWeight: 800,
            fontSize: 14,
            animation: 'askAiFloat 2.5s ease-in-out infinite',
            '@keyframes askAiFloat': {
              '0%, 100%': { boxShadow: '0 0 20px rgba(16, 185, 129, 0.3)', transform: 'translateY(0)' },
              '50%': { boxShadow: '0 0 36px rgba(16, 185, 129, 0.55)', transform: 'translateY(-3px)' },
            },
            '&:hover': {
              boxShadow: '0 0 44px rgba(16, 185, 129, 0.7)',
            },
          }}
        >
          Ask AI
        </Button>
      )}
    </Box>
  );
}
