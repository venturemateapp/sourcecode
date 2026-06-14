import { useState, useMemo, useRef } from 'react';
import {
  Box,
  Typography,
  Card,
  Chip,
  Avatar,
  TextField,
  InputAdornment,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  IconButton,
  Menu,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
} from '@mui/material';
import {
  Search,
  MoreVertical,
  Download,
  Share2,
  Trash2,
  FileText,
  FileSpreadsheet,
  FileImage,
  File as FileIcon,
  Presentation,
  Scale,
  DollarSign,
  Megaphone,
  Box as BoxIcon,
  Users,
  Grid3X3,
  List as ListIcon,
  Plus,
  Upload,
  FolderOpen,
  Building2,
} from 'lucide-react';
import type { ViewType, Document } from '../../types/venturemate';
import { GradientButton } from '../../components/shared/buttons';
import { useBusiness } from '../../contexts/BusinessContext';
import { DomainChat } from '../../components/venturemate/DomainChat';
import { NoBusinessSelected } from '../../components/venturemate/NoBusinessSelected';
import { uploadFile, deleteDocument as apiDeleteDocument } from '../../lib/api';

const documentCategories = [
  { id: 'legal' as const, label: 'Legal', color: '#3b82f6' },
  { id: 'financial' as const, label: 'Financial', color: '#22c55e' },
  { id: 'marketing' as const, label: 'Marketing', color: '#f59e0b' },
  { id: 'product' as const, label: 'Product', color: '#8b5cf6' },
  { id: 'hr' as const, label: 'HR & Team', color: '#ec4899' },
  { id: 'other' as const, label: 'Other', color: '#6b7280' },
];

const fileTypeConfig: Record<string, { color: string; bgColor: string }> = {
  pdf: { color: '#ef4444', bgColor: '#fef2f2' },
  docx: { color: '#3b82f6', bgColor: '#eff6ff' },
  xlsx: { color: '#22c55e', bgColor: '#f0fdf4' },
  pptx: { color: '#f97316', bgColor: '#fff7ed' },
  image: { color: '#8b5cf6', bgColor: '#f5f3ff' },
  other: { color: '#6b7280', bgColor: '#f3f4f6' },
};

const documentTemplates = [
  { id: 'template_001', name: 'Founder Agreement', description: 'Standard founder agreement template', category: 'legal' as const, type: 'docx' as const },
  { id: 'template_002', name: 'Pitch Deck Template', description: 'Investor-ready pitch deck structure', category: 'marketing' as const, type: 'pptx' as const },
  { id: 'template_003', name: 'Financial Model', description: '3-year financial projections template', category: 'financial' as const, type: 'xlsx' as const },
  { id: 'template_004', name: 'Employee Offer Letter', description: 'Standard employment offer letter', category: 'hr' as const, type: 'docx' as const },
  { id: 'template_005', name: 'NDA Template', description: 'Mutual non-disclosure agreement', category: 'legal' as const, type: 'docx' as const },
  { id: 'template_006', name: 'Product Spec', description: 'Product specification document', category: 'product' as const, type: 'docx' as const },
];

interface DocumentsProps {
  onViewChange?: (_view: ViewType) => void;
}

const fileIcons: Record<string, React.ComponentType<{ size?: number; color?: string }>> = {
  pdf: FileText,
  docx: FileText,
  xlsx: FileSpreadsheet,
  pptx: Presentation,
  image: FileImage,
  other: FileIcon,
};

const categoryIcons: Record<string, React.ComponentType<{ size?: number; color?: string }>> = {
  legal: Scale,
  financial: DollarSign,
  marketing: Megaphone,
  product: BoxIcon,
  hr: Users,
  other: FileIcon,
};

export function DocumentsPage({}: DocumentsProps) {
  const { selectedBusiness, userId: _userId, refreshBusiness } = useBusiness();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'size'>('date');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [uploadFileData, setUploadFileData] = useState<File | null>(null);
  const [uploadCategory, setUploadCategory] = useState<string>('other');
  const [uploadTags, setUploadTags] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{type: 'success' | 'error'; message: string} | null>(null);
  const [deleteDocId, setDeleteDocId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get documents for selected business
  const documents = useMemo(() => {
    if (!selectedBusiness) return [];
    return selectedBusiness.documents || [];
  }, [selectedBusiness]);

  // Filter and sort documents
  const filteredDocuments = useMemo(() => {
    let filtered = documents;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        doc =>
          doc.name.toLowerCase().includes(query) ||
          doc.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(doc => doc.category === selectedCategory);
    }

    // Sort
    filtered = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'date':
          return new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime();
        case 'size':
          return parseFloat(b.size) - parseFloat(a.size);
        default:
          return 0;
      }
    });

    return filtered;
  }, [documents, searchQuery, selectedCategory, sortBy]);

  // Get stats for selected business
  const stats = useMemo(() => {
    if (!selectedBusiness) return null;
    const docs = selectedBusiness.documents || [];
    const totalSize = docs.reduce((acc, doc) => {
      const size = parseFloat(doc.size);
      return acc + (isNaN(size) ? 0 : size);
    }, 0);
    return {
      totalDocuments: docs.length,
      totalSize: `${totalSize.toFixed(1)} MB`,
      byCategory: documentCategories.map(cat => ({
        category: cat.id,
        count: docs.filter(d => d.category === cat.id).length,
        color: cat.color,
      })),
      byType: Object.entries(
        docs.reduce((acc, doc) => {
          acc[doc.type] = (acc[doc.type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      ),
    };
  }, [selectedBusiness]);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, doc: Document) => {
    setAnchorEl(event.currentTarget);
    setSelectedDoc(doc);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedDoc(null);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  if (!selectedBusiness) {
    return <NoBusinessSelected message="Select a business to manage documents." />;
  }

  return (
    <Box sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: { xs: 3, md: 4 }, flexDirection: { xs: 'column', sm: 'row' }, gap: { xs: 2, sm: 0 } }}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1, flexWrap: 'wrap' }}>
            <Typography sx={{ fontSize: { xs: 24, sm: 28 }, fontWeight: 700, color: 'var(--vm-text-primary)' }}>
              Documents
            </Typography>
            <Chip
              icon={<Building2 size={14} />}
              label={selectedBusiness?.name}
              sx={{
                bgcolor: `${selectedBusiness?.brandKit.primaryColor}20`,
                color: selectedBusiness?.brandKit.primaryColor,
                fontWeight: 600,
              }}
            />
          </Box>
          <Typography sx={{ fontSize: 15, color: 'var(--vm-text-muted)' }}>
            Manage all your startup documents in one place
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'center', gap: { xs: 1, sm: 2 }, width: { xs: '100%', sm: 'auto' }, '& > *': { flex: { xs: 1, sm: 'none' } } }}>
          <GradientButton variant="outline" size="md" onClick={() => setShowTemplateDialog(true)}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <FileText size={18} />
              Templates
            </Box>
          </GradientButton>
          <GradientButton variant="primary" size="md" onClick={() => setShowUploadDialog(true)}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Upload size={18} />
              Upload
            </Box>
          </GradientButton>
        </Box>
      </Box>

      {/* Stats Cards */}
      {stats && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card sx={{ bgcolor: 'var(--vm-bg-secondary)', border: '1px solid var(--vm-border-subtle)', borderRadius: 2, p: 2 }}>
              <Typography sx={{ fontSize: 12, color: 'var(--vm-text-muted)', mb: 0.5 }}>Total Documents</Typography>
              <Typography sx={{ fontSize: 24, fontWeight: 700, color: 'var(--vm-text-primary)' }}>
                {stats.totalDocuments}
              </Typography>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card sx={{ bgcolor: 'var(--vm-bg-secondary)', border: '1px solid var(--vm-border-subtle)', borderRadius: 2, p: 2 }}>
              <Typography sx={{ fontSize: 12, color: 'var(--vm-text-muted)', mb: 0.5 }}>Storage Used</Typography>
              <Typography sx={{ fontSize: 24, fontWeight: 700, color: 'var(--vm-text-primary)' }}>
                {stats.totalSize}
              </Typography>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card sx={{ bgcolor: 'var(--vm-bg-secondary)', border: '1px solid var(--vm-border-subtle)', borderRadius: 2, p: 2 }}>
              <Typography sx={{ fontSize: 12, color: 'var(--vm-text-muted)', mb: 0.5 }}>Categories</Typography>
              <Typography sx={{ fontSize: 24, fontWeight: 700, color: 'var(--vm-text-primary)' }}>
                {stats.byCategory.filter(c => c.count > 0).length}
              </Typography>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card sx={{ bgcolor: 'var(--vm-bg-secondary)', border: '1px solid var(--vm-border-subtle)', borderRadius: 2, p: 2 }}>
              <Typography sx={{ fontSize: 12, color: 'var(--vm-text-muted)', mb: 0.5 }}>Last Upload</Typography>
              <Typography sx={{ fontSize: 16, fontWeight: 600, color: 'var(--vm-text-primary)' }}>
                {documents.length > 0 ? formatDate(documents[0].uploadedAt) : 'No uploads'}
              </Typography>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Filters Bar */}
      <Card sx={{ bgcolor: 'var(--vm-bg-secondary)', border: '1px solid var(--vm-border-subtle)', borderRadius: 2, p: { xs: 1.5, sm: 2 }, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <TextField
            size="small"
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            sx={{
              flex: 1,
              minWidth: 200,
              '& .MuiOutlinedInput-root': {
                bgcolor: 'var(--vm-bg-tertiary)',
                color: 'var(--vm-text-primary)',
                '& fieldset': { borderColor: 'var(--vm-border-subtle)' },
              },
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search size={18} color="var(--vm-text-muted)" />
                </InputAdornment>
              ),
            }}
          />

          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel sx={{ color: 'var(--vm-text-muted)' }}>Category</InputLabel>
            <Select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              sx={{
                bgcolor: 'var(--vm-bg-tertiary)',
                color: 'var(--vm-text-primary)',
                '& .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--vm-border-subtle)' },
              }}
            >
              <MenuItem value="all">All Categories</MenuItem>
              {documentCategories.map(cat => (
                <MenuItem key={cat.id} value={cat.id}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {(() => {
                      const Icon = categoryIcons[cat.id] || FileIcon;
                      return <Icon size={16} color={cat.color} />;
                    })()}
                    {cat.label}
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 100 }}>
            <InputLabel sx={{ color: 'var(--vm-text-muted)' }}>Sort</InputLabel>
            <Select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'name' | 'date' | 'size')}
              sx={{
                bgcolor: 'var(--vm-bg-tertiary)',
                color: 'var(--vm-text-primary)',
                '& .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--vm-border-subtle)' },
              }}
            >
              <MenuItem value="date">Date Modified</MenuItem>
              <MenuItem value="name">Name</MenuItem>
              <MenuItem value="size">Size</MenuItem>
            </Select>
          </FormControl>

          <Box sx={{ display: 'flex', gap: 1, ml: 'auto' }}>
            <IconButton
              onClick={() => setViewMode('grid')}
              sx={{
                bgcolor: viewMode === 'grid' ? 'var(--vm-primary-600)' : 'transparent',
                color: viewMode === 'grid' ? 'white' : 'var(--vm-text-muted)',
              }}
            >
              <Grid3X3 size={18} />
            </IconButton>
            <IconButton
              onClick={() => setViewMode('list')}
              sx={{
                bgcolor: viewMode === 'list' ? 'var(--vm-primary-600)' : 'transparent',
                color: viewMode === 'list' ? 'white' : 'var(--vm-text-muted)',
              }}
            >
              <ListIcon size={18} />
            </IconButton>
          </Box>
        </Box>
      </Card>

      {/* Documents Grid/List */}
      {filteredDocuments.length === 0 ? (
        <Card sx={{ bgcolor: 'var(--vm-bg-secondary)', border: '1px solid var(--vm-border-subtle)', borderRadius: 3, p: 6, textAlign: 'center' }}>
          <Box
            sx={{
              width: 80,
              height: 80,
              borderRadius: 3,
              bgcolor: 'var(--vm-bg-tertiary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mx: 'auto',
              mb: 3,
            }}
          >
            <FolderOpen size={40} color="var(--vm-text-muted)" />
          </Box>
          <Typography sx={{ fontSize: 18, fontWeight: 600, color: 'var(--vm-text-primary)', mb: 1 }}>
            No documents found
          </Typography>
          <Typography sx={{ fontSize: 14, color: 'var(--vm-text-muted)', mb: 3 }}>
            {searchQuery || selectedCategory !== 'all'
              ? 'Try adjusting your filters'
              : 'Upload your first document or use a template'}
          </Typography>
          <GradientButton variant="primary" size="md" onClick={() => setShowUploadDialog(true)}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Plus size={18} />
              Upload Document
            </Box>
          </GradientButton>
        </Card>
      ) : viewMode === 'grid' ? (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }, gap: { xs: 2, md: 3 } }}>
          {filteredDocuments.map((doc) => {
            const FileIconComp = fileIcons[doc.type] || FileIcon;
            const config = fileTypeConfig[doc.type] || fileTypeConfig.other;
            const category = documentCategories.find(c => c.id === doc.category);

            return (
              <Card
                key={doc.id}
                sx={{
                  bgcolor: 'var(--vm-bg-secondary)',
                  border: '1px solid var(--vm-border-subtle)',
                  borderRadius: 3,
                  p: 3,
                  transition: 'all 0.2s',
                  '&:hover': {
                    borderColor: 'var(--vm-primary-500)',
                    transform: 'translateY(-2px)',
                  },
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: 2,
                      bgcolor: config.bgColor,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <FileIconComp size={24} color={config.color} />
                  </Box>
                  <IconButton size="small" onClick={(e) => handleMenuOpen(e, doc)}>
                    <MoreVertical size={18} color="var(--vm-text-muted)" />
                  </IconButton>
                </Box>

                <Typography sx={{ fontSize: 15, fontWeight: 600, color: 'var(--vm-text-primary)', mb: 0.5, wordBreak: 'break-word' }}>
                  {doc.name}
                </Typography>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <Chip
                    size="small"
                    label={doc.category}
                    sx={{
                      bgcolor: `${category?.color}20`,
                      color: category?.color,
                      fontSize: 10,
                      fontWeight: 600,
                      textTransform: 'capitalize',
                    }}
                  />
                  <Typography sx={{ fontSize: 12, color: 'var(--vm-text-muted)' }}>{doc.size}</Typography>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Avatar src={`https://i.pravatar.cc/150?u=${doc.uploadedBy}`} sx={{ width: 24, height: 24 }} />
                    <Typography sx={{ fontSize: 12, color: 'var(--vm-text-muted)' }}>
                      {formatDate(doc.lastModified)}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    {doc.tags.slice(0, 2).map((tag) => (
                      <Typography key={tag} sx={{ fontSize: 10, color: 'var(--vm-text-muted)', bgcolor: 'var(--vm-bg-tertiary)', px: 0.5, borderRadius: 1 }}>
                        #{tag}
                      </Typography>
                    ))}
                  </Box>
                </Box>
              </Card>
            );
          })}
        </Box>
      ) : (
        <Card sx={{ bgcolor: 'var(--vm-bg-secondary)', border: '1px solid var(--vm-border-subtle)', borderRadius: 3, overflow: 'hidden' }}>
          {filteredDocuments.map((doc, idx) => {
            const FileIconComp = fileIcons[doc.type] || FileIcon;
            const config = fileTypeConfig[doc.type] || fileTypeConfig.other;
            const category = documentCategories.find(c => c.id === doc.category);

            return (
              <Box
                key={doc.id}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  p: 2,
                  borderBottom: idx < filteredDocuments.length - 1 ? '1px solid var(--vm-border-subtle)' : 'none',
                  '&:hover': { bgcolor: 'var(--vm-bg-hover)' },
                }}
              >
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: 2,
                    bgcolor: config.bgColor,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <FileIconComp size={20} color={config.color} />
                </Box>

                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{ fontSize: 14, fontWeight: 600, color: 'var(--vm-text-primary)', mb: 0.25 }}>
                    {doc.name}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip
                      size="small"
                      label={doc.category}
                      sx={{
                        bgcolor: `${category?.color}20`,
                        color: category?.color,
                        fontSize: 10,
                        fontWeight: 600,
                        textTransform: 'capitalize',
                        height: 20,
                      }}
                    />
                    <Typography sx={{ fontSize: 12, color: 'var(--vm-text-muted)' }}>{doc.size}</Typography>
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
                  <Avatar src={`https://i.pravatar.cc/150?u=${doc.uploadedBy}`} sx={{ width: 28, height: 28 }} />
                  <Typography sx={{ fontSize: 12, color: 'var(--vm-text-muted)', width: 80 }}>
                    {formatDate(doc.lastModified)}
                  </Typography>
                  <IconButton size="small" onClick={(e) => handleMenuOpen(e, doc)}>
                    <MoreVertical size={18} color="var(--vm-text-muted)" />
                  </IconButton>
                </Box>
              </Box>
            );
          })}
        </Card>
      )}

      {/* Document Actions Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        PaperProps={{
          sx: {
            bgcolor: 'var(--vm-bg-secondary)',
            border: '1px solid var(--vm-border-subtle)',
            minWidth: 150,
          },
        }}
      >
        <MenuItem onClick={() => {
          if (selectedDoc?.url) window.open(selectedDoc.url, '_blank');
          handleMenuClose();
        }} sx={{ color: 'var(--vm-text-primary)' }}>
          <Download size={16} style={{ marginRight: 8 }} />
          Download
        </MenuItem>
        <MenuItem onClick={() => {
          if (selectedDoc?.url) {
            navigator.clipboard.writeText(selectedDoc.url);
          }
          handleMenuClose();
        }} sx={{ color: 'var(--vm-text-primary)' }}>
          <Share2 size={16} style={{ marginRight: 8 }} />
          Copy Link
        </MenuItem>
        <MenuItem onClick={async () => {
          if (!selectedDoc || !selectedBusiness) return;
          handleMenuClose();
          setDeleteDocId(selectedDoc.id);
          try {
            await apiDeleteDocument(selectedBusiness.id, selectedDoc.id);
            refreshBusiness();
          } catch (e) {
            console.error('Delete failed:', e);
          } finally {
            setDeleteDocId(null);
          }
        }} sx={{ color: '#ef4444' }} disabled={deleteDocId === selectedDoc?.id}>
          {deleteDocId === selectedDoc?.id ? 'Deleting...' : (
            <><Trash2 size={16} style={{ marginRight: 8 }} /> Delete</>
          )}
        </MenuItem>
      </Menu>

      {/* Upload Dialog */}
      <Dialog open={showUploadDialog} onClose={() => { if (!uploading) setShowUploadDialog(false); }} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ color: 'var(--vm-text-primary)', bgcolor: 'var(--vm-bg-secondary)' }}>
          Upload Document
        </DialogTitle>
        <DialogContent sx={{ bgcolor: 'var(--vm-bg-secondary)' }}>
          {uploadStatus && (
            <Box sx={{
              p: 1.5, mb: 2, borderRadius: 2,
              bgcolor: uploadStatus.type === 'success' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
              border: '1px solid',
              borderColor: uploadStatus.type === 'success' ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)',
              color: uploadStatus.type === 'success' ? '#22c55e' : '#ef4444',
              fontSize: 13,
            }}>
              {uploadStatus.message}
            </Box>
          )}
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => {
              if (e.target.files?.[0]) setUploadFileData(e.target.files[0]);
            }}
            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg,.gif,.txt,.csv"
            style={{ display: 'none' }}
          />
          <Box
            onClick={() => fileInputRef.current?.click()}
            sx={{
              border: '2px dashed var(--vm-border-subtle)',
              borderRadius: 3,
              p: 4,
              textAlign: 'center',
              bgcolor: uploadFileData ? 'rgba(99,102,241,0.05)' : 'var(--vm-bg-tertiary)',
              cursor: 'pointer',
              transition: 'all 0.2s',
              '&:hover': { borderColor: 'var(--vm-primary-500)' },
            }}
          >
            {uploadFileData ? (
              <>
                <Box sx={{ width: 48, height: 48, borderRadius: 2, bgcolor: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2 }}>
                  <FileText size={24} color="var(--vm-primary-400)" />
                </Box>
                <Typography sx={{ fontSize: 15, fontWeight: 600, color: 'var(--vm-text-primary)', mb: 0.5 }}>
                  {uploadFileData.name}
                </Typography>
                <Typography sx={{ fontSize: 13, color: 'var(--vm-text-muted)' }}>
                  {(uploadFileData.size / 1024).toFixed(1)} KB
                </Typography>
              </>
            ) : (
              <>
                <Upload size={48} color="var(--vm-text-muted)" style={{ marginBottom: 16 }} />
                <Typography sx={{ fontSize: 16, fontWeight: 600, color: 'var(--vm-text-primary)', mb: 1 }}>
                  Click to select a file
                </Typography>
                <Typography sx={{ fontSize: 12, color: 'var(--vm-text-muted)' }}>
                  Supports PDF, DOCX, XLSX, PPTX, Images up to 50MB
                </Typography>
              </>
            )}
          </Box>
          {uploadFileData && (
            <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
              <Box sx={{ flex: 1 }}>
                <Typography sx={{ fontSize: 12, color: 'var(--vm-text-muted)', mb: 0.5 }}>Category</Typography>
                <select
                  value={uploadCategory}
                  onChange={(e) => setUploadCategory(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: '1px solid var(--vm-border-subtle)',
                    backgroundColor: 'var(--vm-bg-tertiary)',
                    color: 'var(--vm-text-primary)',
                    fontSize: 13,
                  }}
                >
                  {documentCategories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.label}</option>
                  ))}
                </select>
              </Box>
              <Box sx={{ flex: 2 }}>
                <Typography sx={{ fontSize: 12, color: 'var(--vm-text-muted)', mb: 0.5 }}>Tags (comma-separated)</Typography>
                <input
                  value={uploadTags}
                  onChange={(e) => setUploadTags(e.target.value)}
                  placeholder="e.g. contract, signed, Q1"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: '1px solid var(--vm-border-subtle)',
                    backgroundColor: 'var(--vm-bg-tertiary)',
                    color: 'var(--vm-text-primary)',
                    fontSize: 13,
                  }}
                />
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ bgcolor: 'var(--vm-bg-secondary)', p: 2 }}>
          <GradientButton variant="outline" size="md" onClick={() => {
            setShowUploadDialog(false);
            setUploadFileData(null);
            setUploadStatus(null);
            setUploadTags('');
            setUploadCategory('other');
          }} disabled={uploading}>
            Cancel
          </GradientButton>
          <GradientButton variant="primary" size="md" onClick={async () => {
            if (!uploadFileData || !selectedBusiness) return;
            setUploading(true);
            setUploadStatus(null);
            try {
              await uploadFile(uploadFileData, selectedBusiness.id, uploadCategory, uploadTags);
              setUploadStatus({ type: 'success', message: 'Document uploaded successfully!' });
              setUploadFileData(null);
              setUploadTags('');
              setUploadCategory('other');
              refreshBusiness();
              setTimeout(() => setShowUploadDialog(false), 1200);
            } catch (err) {
              setUploadStatus({ type: 'error', message: err instanceof Error ? err.message : 'Upload failed' });
            } finally {
              setUploading(false);
            }
          }} disabled={!uploadFileData || uploading}>
            {uploading ? 'Uploading...' : 'Upload'}
          </GradientButton>
        </DialogActions>
      </Dialog>

      {/* Templates Dialog */}
      <Dialog open={showTemplateDialog} onClose={() => setShowTemplateDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ color: 'var(--vm-text-primary)', bgcolor: 'var(--vm-bg-secondary)' }}>
          Document Templates
        </DialogTitle>
        <DialogContent sx={{ bgcolor: 'var(--vm-bg-secondary)' }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(3, 1fr)', md: 'repeat(4, 1fr)' }, gap: { xs: 1.5, md: 2 } }}>
            {documentTemplates.map((template) => {
              const TemplateIcon = fileIcons[template.type] || FileIcon;
              const category = documentCategories.find(c => c.id === template.category);

              return (
                <Card
                  key={template.id}
                  sx={{
                    bgcolor: 'var(--vm-bg-tertiary)',
                    border: '1px solid var(--vm-border-subtle)',
                    borderRadius: 2,
                    p: 3,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    '&:hover': {
                      borderColor: 'var(--vm-primary-500)',
                    },
                  }}
                >
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: 2,
                      bgcolor: `${category?.color}20`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mb: 2,
                    }}
                  >
                    <TemplateIcon size={24} color={category?.color} />
                  </Box>
                  <Typography sx={{ fontSize: 14, fontWeight: 600, color: 'var(--vm-text-primary)', mb: 0.5 }}>
                    {template.name}
                  </Typography>
                  <Typography sx={{ fontSize: 12, color: 'var(--vm-text-muted)', mb: 1 }}>
                    {template.description}
                  </Typography>
                  <Chip
                    size="small"
                    label={template.category}
                    sx={{
                      bgcolor: `${category?.color}20`,
                      color: category?.color,
                      fontSize: 10,
                      textTransform: 'capitalize',
                    }}
                  />
                </Card>
              );
            })}
          </Box>
        </DialogContent>
        <DialogActions sx={{ bgcolor: 'var(--vm-bg-secondary)', p: 2 }}>
          <GradientButton variant="outline" size="md" onClick={() => setShowTemplateDialog(false)}>
            Close
          </GradientButton>
        </DialogActions>
      </Dialog>
      <DomainChat domain="documents" placeholder="Ask me to organize or create documents..." />
    </Box>
  );
}
