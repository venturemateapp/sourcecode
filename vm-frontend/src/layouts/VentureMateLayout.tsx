import { useState } from 'react';
import { Box, Drawer, useMediaQuery, useTheme } from '@mui/material';
import { Sidebar } from '../components/venturemate/Sidebar';
import { Header } from '../components/venturemate/Header';
import { Footer } from '../components/shared/Footer';
import { AnimatedBackground } from '../components/AnimatedBackground';
import { DomainChat } from '../components/venturemate/DomainChat';
import { AIManagedModuleData } from '../components/venturemate/AIManagedModuleData';
import type { ViewType } from '../types/venturemate';

interface VentureMateLayoutProps {
  activeView: ViewType;
  onViewChange: (view: ViewType) => void;
  children: React.ReactNode;
}

export function VentureMateLayout({
  activeView,
  onViewChange,
  children,
}: VentureMateLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const toggleSidebar = () => setMobileOpen(prev => !prev);

  return (
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden', position: 'relative' }}>
      {/* Animated Background */}
      <AnimatedBackground />

      <Drawer
        variant={isMobile ? 'temporary' : 'permanent'}
        open={isMobile ? mobileOpen : true}
        onClose={isMobile ? () => setMobileOpen(false) : undefined}
        ModalProps={{ keepMounted: true }}
        sx={{
          width: isMobile ? 'auto' : 260,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: 280,
            boxSizing: 'border-box',
            bgcolor: isMobile
              ? 'rgba(10, 10, 15, 0.95)'
              : 'rgba(10, 10, 15, 0.8)',
            backdropFilter: 'blur(20px)',
            borderRight: '1px solid rgba(255, 255, 255, 0.08)',
          },
        }}
      >
        <Sidebar
          onClose={isMobile ? () => setMobileOpen(false) : undefined}
          activeView={activeView}
          onViewChange={onViewChange}
        />
      </Drawer>

      {/* Main Content Area */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          height: '100vh',
          overflow: 'hidden',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* Fixed Header */}
        <Box 
          sx={{ 
            flexShrink: 0,
            bgcolor: 'rgba(10, 10, 15, 0.7)',
            backdropFilter: 'blur(20px) saturate(180%)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            minHeight: { xs: 52, md: 'var(--vm-header-height)' },
          }}
        >
          <Header
            onMenuClick={toggleSidebar}
            activeView={activeView}
            onViewChange={onViewChange}
          />
        </Box>

        {/* Scrollable Main Content */}
        <Box
          component="main"
          sx={{
            flex: 1,
            overflow: 'auto',
            minHeight: 0,
            position: 'relative',
            maxWidth: 'var(--vm-content-max-width)',
            mx: 'auto',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            scrollbarWidth: 'thin',
            '&::-webkit-scrollbar': {
              width: 6,
            },
            '&::-webkit-scrollbar-track': {
              background: 'rgba(255, 255, 255, 0.05)',
            },
            '&::-webkit-scrollbar-thumb': {
              background: 'rgba(16, 185, 129, 0.5)',
              borderRadius: 3,
            },
          }}
        >
          <Box sx={{ flex: 1, p: { xs: 1.5, sm: 2, md: 3 } }}>
            {children}
            {activeView !== 'ai-assistant' && <AIManagedModuleData domain={activeView} />}
          </Box>
          <Footer />
        </Box>
      </Box>
      {activeView !== 'ai-assistant' && (
        <DomainChat
          domain={activeView}
          placeholder={`Ask AI to work in ${activeView.replace(/-/g, ' ')}…`}
        />
      )}
    </Box>
  );
}
