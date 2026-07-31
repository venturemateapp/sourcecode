import { useState, type ReactNode, useRef, useEffect } from 'react';
import { Alert, Box, Card, Chip, TextField, Typography } from '@mui/material';
import { Bot, Check, RefreshCw, Sparkles, X } from 'lucide-react';
import { GenerationProgress } from './GenerationProgress';
import { LogoQuestionnaire } from './LogoQuestionnaire';
import { useBusiness } from '../../contexts/BusinessContext';
import { graphqlRequest } from '../../lib/api';
import { AnimatedButton } from '../shared/AnimatedButton';

export interface ProposedChange {
  id: string;
  type: 'create' | 'update' | 'delete';
  field?: string;
  domain?: string;
  summary: string;
  currentValue?: string;
  newValue: string;
}

interface ProposalResponse {
  proposeAgentAction: { message: string; proposals: ProposedChange[]; };
}

interface ApplyResponse {
  applyAgentProposal: { success: boolean; message: string; };
}

interface StudioMessage {
  role: 'user' | 'assistant';
  content: string;
  id: string;
}

interface AICreationStudioProps {
  domain: string;
  title: string;
  description: string;
  placeholder: string;
  starterPrompts: string[];
  emptyLabel?: string;
  renderCurrent: () => ReactNode;
  renderProposal: (change: ProposedChange) => ReactNode;
  onApproved?: () => Promise<void> | void;
  onBeforeGenerate?: () => boolean | Promise<boolean>;
  builderMode?: boolean;
  stackedBuilderMode?: boolean;
  rightPanel?: ReactNode;
  showLogoQuestionnaire?: boolean;
}

const PROPOSE_MUTATION = `
  mutation ProposeAgentAction($userId: ID!, $businessId: ID!, $prompt: String!, $domain: String) {
    proposeAgentAction(userId: $userId, businessId: $businessId, prompt: $prompt, domain: $domain) {
      message proposals { id type field domain summary currentValue newValue }
    }
  }
`;

const APPLY_MUTATION = `
  mutation ApplyAgentProposal($userId: ID!, $businessId: ID!, $changes: String!) {
    applyAgentProposal(userId: $userId, businessId: $businessId, changes: $changes) {
      success message
    }
  }
`;

let msgCounter = 0;

export function AICreationStudio({
  domain, title: _title, description: _description, placeholder, starterPrompts,
  emptyLabel = 'No approved version yet. Ask AI to create the first one.',
  renderCurrent, renderProposal, onApproved, onBeforeGenerate,
  builderMode = false, stackedBuilderMode = false, rightPanel, showLogoQuestionnaire = false,
}: AICreationStudioProps) {
  const { selectedBusiness, userId, refreshBusiness } = useBusiness();
  const [prompt, setPrompt] = useState('');
  const [lastPrompt, setLastPrompt] = useState('');
  const [messages, setMessages] = useState<StudioMessage[]>([]);
  const [proposalMessage, setProposalMessage] = useState('');
  const [proposal, setProposal] = useState<ProposedChange | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!proposal && !loading) chatInputRef.current?.focus();
  }, [proposal, loading]);

  const requestProposal = async (instruction: string) => {
    if (!selectedBusiness || !userId || !instruction.trim() || loading) return;
    if (onBeforeGenerate) {
      const canProceed = await onBeforeGenerate();
      if (!canProceed) return;
    }
    setLoading(true);
    setError(null);
    setSuccess(null);
    setLastPrompt(instruction.trim());
    const contextualPrompt = proposal
      ? `${instruction.trim()}\n\nRevise the pending AI proposal below. Preserve everything I did not ask to change.\nPending proposal field: ${proposal.field}\nPending proposal JSON:\n${proposal.newValue}`
      : instruction.trim();
    const userMsg: StudioMessage = { role: 'user', content: instruction.trim(), id: `m-${++msgCounter}` };
    setMessages(current => [...current, userMsg]);
    try {
      // Keep the visible approved version aligned with the same authoritative
      // database record the backend reads when it builds the AI context.
      setSyncing(true);
      await refreshBusiness();
      setLastSyncedAt(new Date());
      setSyncing(false);
      const data = await graphqlRequest<ProposalResponse>(PROPOSE_MUTATION, {
        userId, businessId: selectedBusiness.id, prompt: contextualPrompt, domain,
      });
      const result = data.proposeAgentAction;
      const nextProposal = result.proposals?.[0] ?? null;
      setProposal(nextProposal);
      setProposalMessage(result.message || (nextProposal ? 'A new version is ready for review.' : 'No changes were proposed.'));
      const assistantMsg: StudioMessage = { role: 'assistant', content: result.message || 'I prepared a version for review.', id: `m-${++msgCounter}` };
      setMessages(current => [...current, assistantMsg]);
      setPrompt('');
      if (!nextProposal && !result.message) setError('AI did not return a reviewable change. Describe the result you want more specifically.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI generation failed. Please try rephrasing your request.');
    } finally {
      setSyncing(false);
      setLoading(false);
    }
  };

  const syncLatestData = async () => {
    if (syncing || loading || applying) return;
    setSyncing(true);
    setError(null);
    try {
      await refreshBusiness();
      setLastSyncedAt(new Date());
      setSuccess('Latest business data synced. Your next generation will use the current database record.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not sync the latest business data.');
    } finally {
      setSyncing(false);
    }
  };

  const approveProposal = async () => {
    if (!proposal || !selectedBusiness || !userId || applying) return;
    setApplying(true);
    setError(null);
    try {
      const data = await graphqlRequest<ApplyResponse>(APPLY_MUTATION, {
        userId, businessId: selectedBusiness.id, changes: JSON.stringify([proposal]),
      });
      if (!data.applyAgentProposal.success) throw new Error(data.applyAgentProposal.message || 'Approval failed.');
      setSuccess(data.applyAgentProposal.message || 'The approved version is now saved.');
      setMessages(current => [...current, { role: 'assistant', content: 'Approved. I saved this version to the business.', id: `m-${++msgCounter}` }]);
      setProposal(null);
      setProposalMessage('');
      await refreshBusiness();
      await onApproved?.();
      window.dispatchEvent(new CustomEvent('venturemate:ai-data-changed', { detail: { businessId: selectedBusiness.id, domain } }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not approve the proposal.');
    } finally {
      setApplying(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void requestProposal(prompt); }
  };

  return (
    <Box sx={{
      display: stackedBuilderMode ? 'grid' : 'flex',
      gap: builderMode ? 0 : 2.5,
      flexDirection: stackedBuilderMode ? undefined : { xs: 'column', lg: 'row' },
      gridTemplateColumns: stackedBuilderMode ? { xs: 'minmax(0, 1fr)', lg: 'minmax(0, 1fr) 300px' } : undefined,
      minHeight: builderMode && !stackedBuilderMode ? { lg: 'calc(100vh - 190px)' } : undefined,
      border: builderMode ? '1px solid var(--vm-border-subtle)' : undefined,
      borderRadius: builderMode ? 2.5 : undefined,
      overflow: builderMode ? 'hidden' : undefined,
      bgcolor: builderMode ? 'var(--vm-bg-secondary)' : undefined,
    }}>
      {/* Main content area */}
      <Box sx={{
        flex: 1,
        minWidth: 0,
        order: stackedBuilderMode ? undefined : { lg: builderMode ? 2 : 1 },
        gridColumn: stackedBuilderMode ? { lg: '1 / -1' } : undefined,
        bgcolor: builderMode ? 'var(--vm-bg-primary)' : undefined,
      }}>
        {showLogoQuestionnaire && !proposal && !loading ? (
          <Card sx={{
            p: { xs: 1.5, md: 2.5 },
            bgcolor: 'var(--vm-bg-secondary)',
            border: '1px solid var(--vm-border-subtle)',
            borderRadius: builderMode ? 0 : 3,
          }}>
            <LogoQuestionnaire
              defaultBrandName={selectedBusiness?.name}
              defaultTagline={selectedBusiness?.tagline}
              disabled={loading}
              onSubmit={(prompt) => void requestProposal(prompt)}
            />
          </Card>
        ) : proposal ? (
          <Card sx={{
            p: { xs: 1.5, md: 2.5 },
            bgcolor: 'var(--vm-bg-secondary)',
            border: '1px solid var(--vm-primary-600)',
            borderRadius: builderMode ? 0 : 3,
            height: builderMode ? '100%' : undefined,
            position: 'relative',
            overflow: 'hidden',
            '&::before': { content: '""', position: 'absolute', top: 0, left: 0, right: 0, height: 2, bgcolor: 'var(--vm-primary-500)' },
          }}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1.5, mb: 2, flexWrap: 'wrap' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box sx={{ width: 32, height: 32, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'var(--vm-primary-700)' }}>
                  <Sparkles size={16} />
                </Box>
                <Box>
                  <Typography sx={{ color: 'var(--vm-text-primary)', fontWeight: 900, fontSize: 14 }}>AI Proposal</Typography>
                  <Typography sx={{ color: 'var(--vm-text-muted)', fontSize: 11, overflowWrap: 'anywhere', wordBreak: 'break-word' }}>{proposal.summary || proposalMessage}</Typography>
                </Box>
              </Box>
              <Chip label="Not saved" size="small" color="warning" variant="outlined" sx={{ fontSize: 10 }} />
            </Box>

            {renderProposal(proposal)}
          </Card>
        ) : (
          <Card sx={{
            p: { xs: 1.5, md: 2.5 },
            bgcolor: 'var(--vm-bg-secondary)',
            border: '1px solid var(--vm-border-subtle)',
            borderRadius: builderMode ? 0 : 3,
            height: builderMode ? '100%' : undefined,
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
              <Box sx={{ width: 32, height: 32, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#22c55e20' }}>
                <Check size={16} color="#22c55e" />
              </Box>
              <Typography sx={{ color: 'var(--vm-text-primary)', fontWeight: 900, fontSize: 14 }}>Current Approved Version</Typography>
            </Box>
            <Box sx={{ minHeight: 120 }}>
              {renderCurrent() || (
                <Box sx={{ py: 4, textAlign: 'center' }}>
                  <Sparkles size={32} style={{ opacity: .3, margin: '0 auto 12px', display: 'block' }} />
                  <Typography sx={{ color: 'var(--vm-text-muted)', fontSize: 13 }}>{emptyLabel}</Typography>
                </Box>
              )}
            </Box>
          </Card>
        )}
      </Box>

      {/* Chat panel */}
      <Card sx={{
        width: stackedBuilderMode ? '100%' : { xs: '100%', lg: builderMode ? 340 : 380 },
        flexShrink: 0,
        bgcolor: 'var(--vm-bg-secondary)',
        border: '1px solid var(--vm-border-subtle)',
        borderRadius: builderMode ? 0 : 3,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        maxHeight: stackedBuilderMode ? undefined : builderMode ? { lg: 'calc(100vh - 190px)' } : { lg: 600 },
        position: builderMode ? 'relative' : { lg: 'sticky' },
        top: builderMode ? undefined : { lg: 84 },
        order: stackedBuilderMode ? undefined : { lg: builderMode ? 1 : 2 },
      }}>
        {/* Header */}
        <Box sx={{ p: 1.75, borderBottom: '1px solid var(--vm-border-subtle)', bgcolor: 'var(--vm-bg-tertiary)' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
            <Box sx={{ width: 36, height: 36, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'var(--vm-primary-700)' }}>
              <Bot size={20} />
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{ color: 'var(--vm-text-primary)', fontSize: 14, fontWeight: 900 }}>AI Studio</Typography>
              <Typography sx={{ color: 'var(--vm-text-muted)', fontSize: 10 }}>
                {syncing ? 'Syncing latest business data…' : lastSyncedAt ? `Data synced ${lastSyncedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Fresh data · Review · Approve'}
              </Typography>
            </Box>
            <AnimatedButton variant="ghost" size="sm" icon={<RefreshCw size={13} />}
              disabled={syncing || loading || applying} onClick={() => void syncLatestData()}
              sx={{ minWidth: 0, px: 1 }}>
              Sync
            </AnimatedButton>
          </Box>
          {loading && selectedBusiness && <GenerationProgress businessId={selectedBusiness.id} />}
        </Box>

        {/* Messages */}
        {messages.length > 0 && (
          <Box sx={{ flex: 1, overflowY: 'auto', px: 1.5, py: 1.5, display: 'flex', flexDirection: 'column', gap: 1 }}>
            {messages.slice(-8).map((msg) => (
              <Box key={msg.id} sx={{
                alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '92%',
                px: 1.5, py: 1,
                borderRadius: 2,
                bgcolor: msg.role === 'user' ? 'var(--vm-primary-700)' : 'rgba(255,255,255,.04)',
                border: msg.role === 'user' ? 'none' : '1px solid var(--vm-border-subtle)',
              }}>
                <Typography sx={{ color: 'var(--vm-text-primary)', fontSize: 12, whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{msg.content}</Typography>
              </Box>
            ))}
            <div ref={messagesEndRef} />
          </Box>
        )}

          {/* Input area */}
        <Box sx={{ p: 1.75, borderTop: messages.length > 0 ? '1px solid var(--vm-border-subtle)' : 'none', mt: 'auto' }}>
          {error && <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 1.25, py: 0.5, fontSize: 12 }}>{error}</Alert>}
          {success && <Alert severity="success" onClose={() => setSuccess(null)} sx={{ mb: 1.25, py: 0.5, fontSize: 12 }}>{success}</Alert>}

          <Typography sx={{ color: 'var(--vm-text-secondary)', fontSize: 12, fontWeight: 800, mb: 0.75 }}>
            What should AI create or change?
          </Typography>
          <TextField
            fullWidth multiline minRows={3} maxRows={6}
            value={prompt}
            onChange={(e: any) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            inputRef={chatInputRef}
            sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'rgba(0,0,0,.2)' } }}
          />
          <AnimatedButton
            fullWidth variant="primary" size="md"
            icon={<Sparkles size={16} />}
            disabled={!prompt.trim() || loading || applying}
            onClick={() => void requestProposal(prompt)}
            loading={loading}
            sx={{ mt: 1.25 }}
          >
            {proposal ? 'Revise with AI' : 'Generate with AI'}
          </AnimatedButton>

          {/* Next / Approve / Discard buttons always below Generate when proposal exists */}
          {proposal && (
            <>
              {lastPrompt && (
                <AnimatedButton fullWidth variant="secondary" size="sm" icon={<Sparkles size={14} />} disabled={loading || applying}
                  onClick={() => void requestProposal(lastPrompt)}
                  loading={loading} sx={{ mt: 1.5, fontSize: 12 }}>
                  Next — same prompt
                </AnimatedButton>
              )}
              <Box sx={{ mt: 1.5, pt: 1.5, borderTop: '1px solid var(--vm-border-subtle)', display: 'flex', gap: 1 }}>
                <AnimatedButton variant="success" size="sm" icon={<Check size={14} />} disabled={loading || applying} onClick={() => void approveProposal()} loading={applying}
                  sx={{ flex: 1, fontSize: 12 }}>
                  Approve
                </AnimatedButton>
                <AnimatedButton variant="ghost" size="sm" icon={<X size={14} />} disabled={applying} onClick={() => { setProposal(null); setProposalMessage(''); }}
                  sx={{ flex: 1, fontSize: 12, color: 'var(--vm-text-muted)' }}>
                  Discard
                </AnimatedButton>
              </Box>
            </>
          )}

          {!proposal && (
            <>
              <Typography sx={{ color: 'var(--vm-text-muted)', fontSize: 10, mt: 1.5, mb: 0.75 }}>Try asking:</Typography>
              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                {starterPrompts.map(item => (
                  <Chip key={item} label={item} size="small" onClick={() => setPrompt(item)}
                    sx={{ fontSize: 10, cursor: 'pointer', '&:hover': { bgcolor: 'rgba(255,255,255,.08)' }, maxWidth: '100%', '& .MuiChip-label': { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', py: 0.25, lineHeight: 1.4 } }} />
                ))}
              </Box>
            </>
          )}
        </Box>
      </Card>

      {builderMode && rightPanel && (
        <Box sx={{
          width: stackedBuilderMode ? '100%' : { xs: '100%', lg: 300 },
          flexShrink: 0,
          order: stackedBuilderMode ? undefined : { lg: 3 },
          borderLeft: { lg: '1px solid var(--vm-border-subtle)' },
          borderTop: { xs: '1px solid var(--vm-border-subtle)', lg: 0 },
          bgcolor: '#0d1117',
          minHeight: stackedBuilderMode ? undefined : { lg: 'calc(100vh - 190px)' },
          maxHeight: stackedBuilderMode ? undefined : { lg: 'calc(100vh - 190px)' },
          overflow: stackedBuilderMode ? 'visible' : 'auto',
        }}>
          {rightPanel}
        </Box>
      )}
    </Box>
  );
}
