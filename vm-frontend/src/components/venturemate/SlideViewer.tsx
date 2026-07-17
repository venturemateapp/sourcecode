import { useState, useCallback, useRef, useEffect } from 'react';
import { Box, Typography, Chip, IconButton, Tooltip, Slider } from '@mui/material';
import { ChevronLeft, ChevronRight, Maximize2, Minimize2, Download } from 'lucide-react';
import type { Slide } from '../../types/venturemate';

interface SlideViewerProps {
  slides: Slide[];
  title: string;
  primary?: string;
  dark?: string;
}

export function SlideViewer({ slides, title, primary = '#10b981', dark = '#052e24' }: SlideViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const viewerRef = useRef<HTMLDivElement>(null);

  const slide = slides[currentIndex];
  const total = slides.length;

  const goTo = useCallback((index: number) => {
    setCurrentIndex(Math.max(0, Math.min(index, total - 1)));
  }, [total]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); goTo(currentIndex + 1); }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); goTo(currentIndex - 1); }
    if (e.key === 'Escape') setFullscreen(false);
    if (e.key === 'f') setFullscreen(p => !p);
  }, [currentIndex, goTo]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    if (fullscreen) viewerRef.current?.requestFullscreen?.().catch(() => {});
    else document.exitFullscreen?.().catch(() => {});
  }, [fullscreen]);

  const exportPptx = () => {
    // Uses JSZip-like approach - for now exports slide data as JSON for download
    const data = JSON.stringify({ title, slides }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${title.replace(/[^a-zA-Z0-9]/g, '_')}_slides.json`;
    a.click();
  };

  if (!slide) return null;

  return (
    <Box ref={viewerRef} sx={{ position: 'relative', width: '100%' }}>
      <Box sx={{
        position: 'relative', width: '100%', aspectRatio: '16 / 9',
        maxHeight: fullscreen ? '100vh' : { xs: 280, sm: 400, md: 500 },
        borderRadius: fullscreen ? 0 : 2.5, overflow: 'hidden',
        background: `radial-gradient(circle at 85% 15%, ${primary}66, transparent 30%), linear-gradient(135deg, ${currentIndex === 0 ? '#052e24' : dark}, #07130f)`,
        border: fullscreen ? 'none' : '1px solid var(--vm-border-subtle)',
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
        px: { xs: 3, sm: 6, md: 10 }, py: { xs: 3, sm: 5, md: 7 },
        '&:hover .slide-nav': { opacity: 1 },
      }}>
        <Typography sx={{ position: 'absolute', top: { xs: 8, sm: 16 }, right: { xs: 10, sm: 20 }, color: 'rgba(255,255,255,.4)', fontSize: { xs: 10, sm: 12 } }}>
          {currentIndex + 1} / {total}
        </Typography>

        <Chip label={slide.type?.replace('_', ' ') || 'slide'} size="small" sx={{
          position: 'absolute', top: { xs: 8, sm: 16 }, left: { xs: 10, sm: 20 },
          textTransform: 'capitalize', bgcolor: 'rgba(255,255,255,.08)', color: 'rgba(255,255,255,.7)',
          fontSize: { xs: 9, sm: 10 }, height: { xs: 20, sm: 24 },
        }} />

        <Typography sx={{
          color: 'white', fontSize: { xs: 22, sm: 32, md: 42 }, fontWeight: 900,
          textAlign: slide.layout === 'center' ? 'center' : 'left', lineHeight: 1.2,
          mb: slide.content || slide.bullets?.length ? { xs: 1, sm: 2 } : 0,
        }}>{slide.title}</Typography>

        {slide.content && (
          <Typography sx={{
            color: 'rgba(255,255,255,.8)', fontSize: { xs: 11, sm: 14, md: 16 },
            lineHeight: 1.6, textAlign: slide.layout === 'center' ? 'center' : 'left',
            maxWidth: slide.layout === 'center' ? '80%' : '100%', mx: slide.layout === 'center' ? 'auto' : 0,
          }}>{slide.content}</Typography>
        )}

        {slide.bullets && slide.bullets.length > 0 && (
          <Box component="ul" sx={{ color: 'rgba(255,255,255,.86)', mt: { xs: 1, sm: 2 }, mb: 0, pl: { xs: 2, sm: 3 } }}>
            {slide.bullets.map((bullet, bi) => (
              <Typography component="li" key={bi} sx={{ fontSize: { xs: 11, sm: 13, md: 15 }, mb: { xs: 0.3, sm: 0.5 }, lineHeight: 1.5 }}>{bullet}</Typography>
            ))}
          </Box>
        )}

        <Box className="slide-nav" sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', opacity: 0, transition: 'opacity .2s', px: { xs: 0.5, sm: 1 } }}>
          <IconButton onClick={() => goTo(currentIndex - 1)} disabled={currentIndex === 0}
            sx={{ bgcolor: 'rgba(0,0,0,.4)', color: 'white', '&:hover': { bgcolor: 'rgba(0,0,0,.6)' }, '&.Mui-disabled': { opacity: 0.2 } }}>
            <ChevronLeft size={24} />
          </IconButton>
          <IconButton onClick={() => goTo(currentIndex + 1)} disabled={currentIndex === total - 1}
            sx={{ bgcolor: 'rgba(0,0,0,.4)', color: 'white', '&:hover': { bgcolor: 'rgba(0,0,0,.6)' }, '&.Mui-disabled': { opacity: 0.2 } }}>
            <ChevronRight size={24} />
          </IconButton>
        </Box>

        <Box onClick={() => goTo(currentIndex + 1)} sx={{ position: 'absolute', inset: 0, cursor: 'pointer' }} />
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1.5, flexWrap: 'wrap' }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontSize: 13, fontWeight: 700, color: 'var(--vm-text-primary)' }}>{slide.title}</Typography>
          <Typography sx={{ fontSize: 11, color: 'var(--vm-text-muted)' }}>Slide {currentIndex + 1} of {total} · {title}</Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <IconButton size="small" onClick={() => goTo(currentIndex - 1)} disabled={currentIndex === 0} sx={{ color: 'var(--vm-text-muted)' }}><ChevronLeft size={18} /></IconButton>
          <Slider value={currentIndex} onChange={(_, v) => goTo(v as number)} min={0} max={total - 1}
            sx={{ width: { xs: 80, sm: 120 }, mx: 1, color: 'var(--vm-primary-500)' }} />
          <IconButton size="small" onClick={() => goTo(currentIndex + 1)} disabled={currentIndex === total - 1} sx={{ color: 'var(--vm-text-muted)' }}><ChevronRight size={18} /></IconButton>
        </Box>

        <Tooltip title="Fullscreen (F)"><IconButton size="small" onClick={() => setFullscreen(p => !p)} sx={{ color: 'var(--vm-text-muted)' }}>
          {fullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
        </IconButton></Tooltip>
        <Tooltip title="Export JSON"><IconButton size="small" onClick={exportPptx} sx={{ color: 'var(--vm-text-muted)' }}><Download size={16} /></IconButton></Tooltip>
      </Box>
    </Box>
  );
}
