import { useMemo, useState, type ChangeEvent, type ReactNode } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  TextField,
  Typography,
} from '@mui/material';
import { Bot, Check, RefreshCw, Send, Sparkles, X } from 'lucide-react';
import { GenerationProgress } from './GenerationProgress';
import { useBusiness } from '../../contexts/BusinessContext';
import { graphqlRequest } from '../../lib/api';

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
  proposeAgentAction: {
    message: string;
    proposals: ProposedChange[];
  };
}

interface ApplyResponse {
  applyAgentProposal: {
    success: boolean;
    message: string;
  };
}

interface StudioMessage {
  role: 'user' | 'assistant';
  content: string;
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
}

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
    applyAgentProposal(userId: $userId, businessId: $businessId, changes: $changes) {
      success
      message
    }
  }
`;

function humanize(value: string) {
  return value.replace(/-/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase());
}

export function AICreationStudio({
  domain,
  title,
  description,
  placeholder,
  starterPrompts,
  emptyLabel = 'No approved version yet. Ask AI to create the first one.',
  renderCurrent,
  renderProposal,
  onApproved,
}: AICreationStudioProps) {
  const { selectedBusiness, userId, refreshBusiness } = useBusiness();
  const [prompt, setPrompt] = useState('');
  const [revision, setRevision] = useState('');
  const [messages, setMessages] = useState<StudioMessage[]>([]);
  const [proposalMessage, setProposalMessage] = useState('');
  const [proposal, setProposal] = useState<ProposedChange | null>(null);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const requestProposal = async (instruction: string) => {
    if (!selectedBusiness || !userId || !instruction.trim() || loading) return;
    setLoading(true);
    setError(null);
    setSuccess(null);
    const contextualPrompt = proposal
      ? `${instruction.trim()}\n\nRevise the pending AI proposal below. Preserve everything I did not ask to change.\nPending proposal field: ${proposal.field}\nPending proposal JSON:\n${proposal.newValue}`
      : instruction.trim();
    setMessages(current => [...current, { role: 'user', content: instruction.trim() }]);
    try {
      const data = await graphqlRequest<ProposalResponse>(PROPOSE_MUTATION, {
        userId,
        businessId: selectedBusiness.id,
        prompt: contextualPrompt,
        domain,
      });
      const result = data.proposeAgentAction;
      const nextProposal = result.proposals?.[0] ?? null;
      setProposal(nextProposal);
      setProposalMessage(result.message || (nextProposal ? 'A new version is ready for review.' : 'No changes were proposed.'));
      setMessages(current => [...current, { role: 'assistant', content: result.message || 'I prepared a version for review.' }]);
      setPrompt('');
      setRevision('');
      if (!nextProposal) setError('AI did not return a reviewable change. Describe the result you want more specifically.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI generation failed.');
    } finally {
      setLoading(false);
    }
  };

  const approveProposal = async () => {
    if (!proposal || !selectedBusiness || !userId || applying) return;
    setApplying(true);
    setError(null);
    try {
      const data = await graphqlRequest<ApplyResponse>(APPLY_MUTATION, {
        userId,
        businessId: selectedBusiness.id,
        changes: JSON.stringify([proposal]),
      });
      if (!data.applyAgentProposal.success) {
        throw new Error(data.applyAgentProposal.message || 'Approval failed.');
      }
      setSuccess(data.applyAgentProposal.message || 'The approved version is now saved.');
      setMessages(current => [...current, { role: 'assistant', content: 'Approved. I saved this version to the business.' }]);
      setProposal(null);
      setProposalMessage('');
      await refreshBusiness();
      await onApproved?.();
      window.dispatchEvent(new CustomEvent('venturemate:ai-data-changed', {
        detail: { businessId: selectedBusiness.id, domain },
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not approve the proposal.');
    } finally {
      setApplying(false);
    }
  };

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1.25fr) minmax(360px, .75fr)' }, gap: 2.5 }}>
      <Box sx={{ minWidth: 0 }}>
        <Box sx={{ mb: 2 }}>
          <Typography sx={{ color: 'var(--vm-text-primary)', fontSize: { xs: 21, md: 28 }, fontWeight: 900 }}>
            {title}
          </Typography>
          <Typography sx={{ color: 'var(--vm-text-muted)', fontSize: 13, mt: 0.5, maxWidth: 760 }}>
            {description}
          </Typography>
        </Box>

        {proposal ? (
          <Card sx={{ p: { xs: 1.5, md: 2.5 }, bgcolor: 'var(--vm-bg-secondary)', border: '1px solid var(--vm-primary-600)', borderRadius: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1.5, mb: 2, flexWrap: 'wrap' }}>
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                  <Sparkles size={18} color="var(--vm-primary-400)" />
                  <Typography sx={{ color: 'var(--vm-text-primary)', fontWeight: 900 }}>AI proposal — not saved yet</Typography>
                </Box>
                <Typography sx={{ color: 'var(--vm-text-muted)', fontSize: 12 }}>{proposal.summary || proposalMessage}</Typography>
              </Box>
            </Box>

            {renderProposal(proposal)}

            <Box sx={{ mt: 2.5, p: 1.5, bgcolor: 'var(--vm-bg-tertiary)', border: '1px solid var(--vm-border-subtle)', borderRadius: 2.5 }}>
              <Typography sx={{ color: 'var(--vm-text-secondary)', fontSize: 12, fontWeight: 800, mb: 1 }}>
                Tell AI what to change in this version
              </Typography>
              <TextField
                fullWidth
                multiline
                minRows={2}
                maxRows={5}
                value={revision}
                onChange={(event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setRevision(event.target.value)}
                placeholder="Example: Keep the layout, make the headline shorter, use a warmer green, and remove the pricing section."
              />
              <Box sx={{ mt: 1.25, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Button
                  variant="contained"
                  startIcon={loading ? <CircularProgress size={15} /> : <Send size={15} />}
                  disabled={!revision.trim() || loading || applying}
                  onClick={() => void requestProposal(revision)}
                >
                  Update proposal
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<RefreshCw size={15} />}
                  disabled={loading || applying}
                  onClick={() => void requestProposal(`Create a distinctly different alternative for this ${humanize(domain)}. Keep it relevant to my approved business details.`)}
                >
                  Show another
                </Button>
                <Button
                  variant="contained"
                  color="success"
                  startIcon={applying ? <CircularProgress size={15} /> : <Check size={16} />}
                  disabled={loading || applying}
                  onClick={() => void approveProposal()}
                >
                  Approve this version
                </Button>
                <Button
                  variant="text"
                  startIcon={<X size={15} />}
                  disabled={applying}
                  onClick={() => { setProposal(null); setProposalMessage(''); setRevision(''); }}
                >
                  Discard
                </Button>
              </Box>
            </Box>
          </Card>
        ) : (
          <Card sx={{ p: { xs: 1.5, md: 2.5 }, bgcolor: 'var(--vm-bg-secondary)', border: '1px solid var(--vm-border-subtle)', borderRadius: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
              <Check size={18} color="var(--vm-primary-400)" />
              <Typography sx={{ color: 'var(--vm-text-primary)', fontWeight: 900 }}>Current approved version</Typography>
            </Box>
            <Box sx={{ minHeight: 150 }}>
              {renderCurrent() || <Typography sx={{ color: 'var(--vm-text-muted)' }}>{emptyLabel}</Typography>}
            </Box>
          </Card>
        )}
      </Box>

      <Card sx={{ bgcolor: 'var(--vm-bg-secondary)', border: '1px solid var(--vm-border-subtle)', borderRadius: 3, overflow: 'hidden', alignSelf: 'start', position: { lg: 'sticky' }, top: { lg: 84 } }}>
        <Box sx={{ p: 1.75, borderBottom: '1px solid var(--vm-border-subtle)', bgcolor: 'var(--vm-bg-tertiary)' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
            <Box sx={{ width: 38, height: 38, borderRadius: 2, display: 'grid', placeItems: 'center', bgcolor: 'var(--vm-primary-700)' }}>
              <Bot size={20} />
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{ color: 'var(--vm-text-primary)', fontSize: 14, fontWeight: 900 }}>Create with VentureMate AI</Typography>
              <Typography sx={{ color: 'var(--vm-text-muted)', fontSize: 11 }}>Describe it. Review it. Approve it.</Typography>
            </Box>
          </Box>
          {loading && selectedBusiness && <GenerationProgress businessId={selectedBusiness.id} />}
        </Box>

        <Box sx={{ p: 1.75 }}>
          {messages.length > 0 && (
            <Box sx={{ maxHeight: 190, overflowY: 'auto', mb: 1.5, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
              {messages.slice(-6).map((message, index) => (
                <Box key={`${message.role}-${index}`} sx={{ alignSelf: message.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '90%', px: 1.25, py: 0.85, borderRadius: 2, bgcolor: message.role === 'user' ? 'var(--vm-primary-700)' : 'var(--vm-bg-tertiary)', border: '1px solid var(--vm-border-subtle)' }}>
                  <Typography sx={{ color: 'var(--vm-text-primary)', fontSize: 12, whiteSpace: 'pre-wrap' }}>{message.content}</Typography>
                </Box>
              ))}
            </Box>
          )}

          {error && <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 1.25 }}>{error}</Alert>}
          {success && <Alert severity="success" onClose={() => setSuccess(null)} sx={{ mb: 1.25 }}>{success}</Alert>}

          <Typography sx={{ color: 'var(--vm-text-secondary)', fontSize: 12, fontWeight: 800, mb: 0.75 }}>
            What should AI create or change?
          </Typography>
          <TextField
            fullWidth
            multiline
            minRows={4}
            maxRows={8}
            value={prompt}
            onChange={(event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setPrompt(event.target.value)}
            placeholder={placeholder}
          />
          <Button
            fullWidth
            variant="contained"
            sx={{ mt: 1.25 }}
            startIcon={loading ? <CircularProgress size={16} /> : <Sparkles size={17} />}
            disabled={!prompt.trim() || loading || applying}
            onClick={() => void requestProposal(prompt)}
          >
            {proposal ? 'Revise with AI' : 'Generate proposal'}
          </Button>

          <Typography sx={{ color: 'var(--vm-text-muted)', fontSize: 11, mt: 1.75, mb: 0.75 }}>Try saying:</Typography>
          <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', alignItems: 'flex-start' }}>
            {starterPrompts.map(item => (
              <Chip key={item} label={item} size="small" onClick={() => setPrompt(item)} sx={{ maxWidth: '100%', minWidth: 0, flexShrink: 1, height: 'auto', '& .MuiChip-label': { whiteSpace: 'normal', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, wordBreak: 'break-word', py: 0.5, lineHeight: 1.4 } }} />
            ))}
          </Box>
        </Box>
      </Card>
    </Box>
  );
}
