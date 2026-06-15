import { useState } from 'react';
import { Box, Typography, Card, Chip, TextField, Stack, IconButton, Menu, MenuItem } from '@mui/material';
import { Plus, MoreVertical, Edit2, Trash2, Sparkles, Share2, Save, X } from 'lucide-react';
import type { PlanSection } from '../../types/venturemate';
import { useBusiness } from '../../contexts/BusinessContext';
import { DomainChat } from '../../components/venturemate/DomainChat';

export function BusinessPlan() {
  const { selectedBusiness: business, updateBusiness, refreshBusiness } = useBusiness();
  const businessPlan = business?.businessPlan;
  const sections = businessPlan?.sections ?? [];
  const [activeTab, setActiveTab] = useState(0);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedSection, setSelectedSection] = useState<PlanSection | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftContent, setDraftContent] = useState('');

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, section: PlanSection) => {
    setAnchorEl(event.currentTarget);
    setSelectedSection(section);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedSection(null);
  };

  const handleAddSection = () => {
    if (!businessPlan) return;
    const newSection: PlanSection = {
      id: `sec_${Date.now()}`,
      title: `New Section ${sections.length + 1}`,
      content: '',
      aiGenerated: false,
      order: sections.length,
    };
    const updatedPlan = {
      ...businessPlan,
      sections: [...sections, newSection],
      lastModified: new Date().toISOString(),
    };
    updateBusiness(business!.id, { businessPlan: updatedPlan });
    setActiveTab(sections.length);
  };

  const handleEnterEditMode = () => {
    if (sections[activeTab]) {
      setDraftTitle(sections[activeTab].title);
      setDraftContent(sections[activeTab].content);
      setEditMode(true);
    }
  };

  const handleCancelEdit = () => {
    setEditMode(false);
  };

  const handleSaveSection = () => {
    if (!businessPlan || !sections[activeTab]) return;
    const updatedSections = sections.map((s, i) =>
      i === activeTab
        ? { ...s, title: draftTitle, content: draftContent }
        : s
    );
    const updatedPlan = {
      ...businessPlan,
      sections: updatedSections,
      lastModified: new Date().toISOString(),
    };
    setSaving(true);
    updateBusiness(business!.id, { businessPlan: updatedPlan }).then(() => {
      setEditMode(false);
      refreshBusiness();
      setSaving(false);
    });
  };

  const handleDeleteSection = () => {
    if (!businessPlan || !selectedSection) return;
    const updatedSections = sections.filter(s => s.id !== selectedSection.id);
    const updatedPlan = {
      ...businessPlan,
      sections: updatedSections,
      lastModified: new Date().toISOString(),
    };
    updateBusiness(business!.id, { businessPlan: updatedPlan });
    if (activeTab >= updatedSections.length && activeTab > 0) {
      setActiveTab(activeTab - 1);
    }
    handleMenuClose();
  };

  const handleEditFromMenu = () => {
    handleMenuClose();
    handleEnterEditMode();
  };

  if (!business) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography sx={{ color: 'var(--vm-text-muted)' }}>
          Please select a business to view business plan
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Stats */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)' }, gap: { xs: 2, md: 3 }, mb: { xs: 3, md: 4 } }}>
        {[
          { label: 'Sections', value: sections.length },
          { label: 'AI Generated', value: sections.filter(s => s.aiGenerated).length },
          { label: 'Words', value: sections.reduce((acc, s) => acc + s.content.split(' ').length, 0).toLocaleString() },
          { label: 'Version', value: businessPlan?.version ?? '1.0' },
        ].map((stat) => (
          <Card
            key={stat.label}
            sx={{
              bgcolor: 'var(--vm-bg-secondary)',
              border: '1px solid var(--vm-border-subtle)',
              borderRadius: 3,
              p: 3,
            }}
          >
            <Typography sx={{ fontSize: 24, fontWeight: 700, color: 'var(--vm-text-primary)' }}>
              {stat.value}
            </Typography>
            <Typography sx={{ fontSize: 13, color: 'var(--vm-text-muted)' }}>
              {stat.label}
            </Typography>
          </Card>
        ))}
      </Box>

      {/* Content */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '280px 1fr' }, gap: { xs: 2, md: 3 } }}>
        {/* Sidebar - Sections List */}
        <Card
          sx={{
            bgcolor: 'var(--vm-bg-secondary)',
            border: '1px solid var(--vm-border-subtle)',
            borderRadius: 3,
            p: { xs: 1.5, sm: 2 },
            height: 'fit-content',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography sx={{ fontSize: 14, fontWeight: 600, color: 'var(--vm-text-primary)' }}>
              Sections
            </Typography>
            <Box
              component="button"
              onClick={handleAddSection}
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 28,
                height: 28,
                borderRadius: 1,
                border: 'none',
                bgcolor: 'var(--vm-primary-600)',
                color: 'white',
                cursor: 'pointer',
                '&:hover': { bgcolor: 'var(--vm-primary-500)' },
              }}
            >
              <Plus size={16} />
            </Box>
          </Box>
          <Stack spacing={0.5}>
            {sections.map((section, index) => (
              <Box
                key={section.id}
                onClick={() => setActiveTab(index)}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  p: 1.5,
                  borderRadius: 1.5,
                  cursor: 'pointer',
                  bgcolor: activeTab === index ? 'var(--vm-bg-hover)' : 'transparent',
                  border: '1px solid',
                  borderColor: activeTab === index ? 'var(--vm-border-secondary)' : 'transparent',
                  '&:hover': { bgcolor: 'var(--vm-bg-hover)' },
                }}
              >
                <Typography
                  sx={{
                    width: 24,
                    height: 24,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '50%',
                    fontSize: 12,
                    fontWeight: 600,
                    bgcolor: section.aiGenerated ? 'var(--vm-primary-900)' : 'var(--vm-bg-tertiary)',
                    color: section.aiGenerated ? 'var(--vm-primary-400)' : 'var(--vm-text-muted)',
                  }}
                >
                  {index + 1}
                </Typography>
                <Typography
                  sx={{
                    flex: 1,
                    fontSize: 13,
                    fontWeight: activeTab === index ? 600 : 400,
                    color: activeTab === index ? 'var(--vm-text-primary)' : 'var(--vm-text-secondary)',
                  }}
                >
                  {section.title}
                </Typography>
                {section.aiGenerated && (
                  <Sparkles size={14} color="#34d399" />
                )}
              </Box>
            ))}
          </Stack>
        </Card>

        {/* Main Content */}
        <Card
          sx={{
            bgcolor: 'var(--vm-bg-secondary)',
            border: '1px solid var(--vm-border-subtle)',
            borderRadius: 3,
            p: 4,
          }}
        >
          {sections.length > 0 ? (
            editMode ? (
              <Stack spacing={3}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <TextField
                    value={draftTitle}
                    onChange={(e) => setDraftTitle(e.target.value)}
                    fullWidth
                    sx={{
                      '& .MuiInputBase-root': {
                        bgcolor: 'var(--vm-bg-primary)',
                        color: 'var(--vm-text-primary)',
                        fontSize: 24,
                        fontWeight: 700,
                      },
                      '& .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--vm-border-primary)' },
                      '& .MuiInputLabel-root': { color: 'var(--vm-text-muted)' },
                    }}
                  />
                  <Box sx={{ display: 'flex', gap: 1, ml: 2 }}>
                    <Box
                      component="button"
                      onClick={handleCancelEdit}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        py: 1,
                        px: 2,
                        borderRadius: 1.5,
                        border: '1px solid var(--vm-border-primary)',
                        bgcolor: 'transparent',
                        color: 'var(--vm-text-secondary)',
                        fontSize: 13,
                        cursor: 'pointer',
                      }}
                    >
                      <X size={14} />
                      Cancel
                    </Box>
                    <Box
                      component="button"
                      onClick={handleSaveSection}
                      disabled={saving}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        py: 1,
                        px: 2,
                        borderRadius: 1.5,
                        border: 'none',
                        bgcolor: 'var(--vm-primary-600)',
                        color: 'white',
                        fontSize: 13,
                        cursor: 'pointer',
                        opacity: saving ? 0.6 : 1,
                      }}
                    >
                      <Save size={14} />
                      {saving ? 'Saving...' : 'Save'}
                    </Box>
                  </Box>
                </Box>
                <TextField
                  multiline
                  rows={20}
                  value={draftContent}
                  onChange={(e) => setDraftContent(e.target.value)}
                  sx={{
                    '& .MuiInputBase-root': {
                      bgcolor: 'var(--vm-bg-primary)',
                      color: 'var(--vm-text-primary)',
                      alignItems: 'flex-start',
                    },
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--vm-border-primary)' },
                  }}
                />
              </Stack>
            ) : (
              <>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                  <Box>
                    <Typography sx={{ fontSize: 24, fontWeight: 700, color: 'var(--vm-text-primary)', mb: 1 }}>
                      {sections[activeTab].title}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {sections[activeTab].aiGenerated && (
                        <Chip
                          size="small"
                          icon={<Sparkles size={14} />}
                          label="AI Generated"
                          sx={{
                            bgcolor: 'var(--vm-primary-900)',
                            color: 'var(--vm-primary-400)',
                            fontSize: 11,
                          }}
                        />
                      )}
                      <Typography sx={{ fontSize: 13, color: 'var(--vm-text-muted)' }}>
                        Last edited {new Date(businessPlan?.lastModified ?? Date.now()).toLocaleDateString()}
                      </Typography>
                    </Box>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <IconButton
                      onClick={handleEnterEditMode}
                      sx={{ color: 'var(--vm-text-muted)' }}
                    >
                      <Edit2 size={18} />
                    </IconButton>
                    <IconButton
                      onClick={(e) => handleMenuOpen(e, sections[activeTab])}
                      sx={{ color: 'var(--vm-text-muted)' }}
                    >
                      <MoreVertical size={18} />
                    </IconButton>
                  </Box>
                </Box>
                <Typography
                  sx={{
                    fontSize: 15,
                    color: 'var(--vm-text-secondary)',
                    lineHeight: 1.8,
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {sections[activeTab].content}
                </Typography>
              </>
            )
          ) : (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Typography sx={{ color: 'var(--vm-text-muted)' }}>
                No sections yet. Add your first section to get started.
              </Typography>
            </Box>
          )}
        </Card>
      </Box>

      {/* Context Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        PaperProps={{
          sx: {
            bgcolor: 'var(--vm-bg-secondary)',
            border: '1px solid var(--vm-border-subtle)',
            borderRadius: 2,
          },
        }}
      >
        <MenuItem onClick={handleEditFromMenu} sx={{ color: 'var(--vm-text-primary)', fontSize: 14 }}>
          <Edit2 size={16} style={{ marginRight: 8 }} />
          Edit Section
        </MenuItem>
        <MenuItem onClick={handleMenuClose} sx={{ color: 'var(--vm-text-primary)', fontSize: 14 }}>
          <Sparkles size={16} style={{ marginRight: 8 }} />
          Regenerate with AI
        </MenuItem>
        <MenuItem onClick={handleMenuClose} sx={{ color: 'var(--vm-text-primary)', fontSize: 14 }}>
          <Share2 size={16} style={{ marginRight: 8 }} />
          Share Section
        </MenuItem>
        <MenuItem onClick={handleDeleteSection} sx={{ color: '#ef4444', fontSize: 14 }}>
          <Trash2 size={16} style={{ marginRight: 8 }} />
          Delete Section
        </MenuItem>
      </Menu>
      <DomainChat domain="business plan" placeholder="Ask me to help with your business plan..." />
    </Box>
  );
}
