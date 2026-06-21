import { useState } from 'react';
import { Box, Typography, Card, Tabs, Tab, Chip, Avatar, Rating, Dialog, DialogTitle, DialogContent, Grid, TextField, Stepper, Step, StepLabel, useTheme, useMediaQuery } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers';
import { GradientButton } from '../../components/shared/buttons';
import {
  Star,
  Calendar,
  ArrowRight,
  CheckCircle,
  MapPin,
  Globe,
  Clock,
  Briefcase,
  X,
  Check,
} from 'lucide-react';
// --- Inline marketplace data ---

interface MarketplaceService {
  id: string;
  title: string;
  description: string;
  full_description: string;
  category: string;
  price_range: { min: number; max: number };
  currency: string;
  provider_id: string;
  provider_name: string;
  provider_avatar?: string;
  provider_bio: string;
  provider_location: string;
  provider_languages: string[];
  provider_response_time: string;
  provider_completed_projects: number;
  rating: number;
  review_count: number;
  delivery_time: string;
  tags: string[];
  whats_included: string[];
  requirements: string[];
  portfolio: { title: string; image: string; description: string }[];
  reviews: { author: string; avatar: string; rating: number; date: string; comment: string }[];
}

interface ServiceBooking {
  id: string;
  service_id: string;
  service_title: string;
  provider_name: string;
  status: 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';
  agreed_price: number;
  currency: string;
  deadline: string;
  requirements: string;
  created_at: string;
}

interface ServiceProvider {
  id: string;
  name: string;
  avatar?: string;
  company: string;
  bio: string;
  expertise: string[];
  rating: number;
  completed_projects: number;
  response_time: string;
}

const serviceCategories = ['All', 'Legal', 'Accounting', 'Marketing', 'Design', 'Development', 'Media', 'Consulting', 'HR', 'Compliance'] as const;

const marketplaceServices: MarketplaceService[] = [
  {
    id: 'svc_001',
    title: 'Startup Legal Package',
    description: 'Complete legal setup for startups including incorporation, founder agreements, and IP assignment.',
    full_description: 'Our comprehensive Startup Legal Package covers everything you need to legally establish and protect your startup.',
    category: 'Legal',
    price_range: { min: 2000, max: 5000 },
    currency: 'USD',
    provider_id: 'prov_001',
    provider_name: 'Sarah Legal',
    provider_avatar: 'https://i.pravatar.cc/150?u=sarahlegal',
    provider_bio: 'Experienced startup attorney with 15+ years helping founders navigate legal complexities.',
    provider_location: 'San Francisco, CA',
    provider_languages: ['English', 'Spanish'],
    provider_response_time: '< 2 hours',
    provider_completed_projects: 127,
    rating: 4.9,
    review_count: 127,
    delivery_time: '1-2 weeks',
    tags: ['Incorporation', 'Contracts', 'IP'],
    whats_included: ['Delaware C-Corp formation', 'Founder agreements', 'IP assignment agreements'],
    requirements: ['Company name', 'Founder information', 'IP inventory'],
    portfolio: [
      { title: 'TechCorp Incorporation', image: 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=300&h=200&fit=crop', description: 'Complete legal setup for AI startup' },
    ],
    reviews: [
      { author: 'John Doe', avatar: 'https://i.pravatar.cc/150?u=john', rating: 5, date: '2024-03-15', comment: 'Excellent service!' },
    ],
  },
];

const serviceBookings: ServiceBooking[] = [
  {
    id: 'booking_001',
    service_id: 'svc_001',
    service_title: 'Startup Legal Package',
    provider_name: 'Sarah Legal',
    status: 'completed',
    agreed_price: 3500,
    currency: 'USD',
    deadline: '2024-03-15',
    requirements: 'Delaware C-Corp setup',
    created_at: '2024-03-01T10:00:00Z',
  },
];

const serviceProviders: ServiceProvider[] = [
  {
    id: 'prov_001',
    name: 'Sarah Legal',
    avatar: 'https://i.pravatar.cc/150?u=sarahlegal',
    company: 'Startup Law Group',
    bio: 'Experienced startup attorney specializing in early-stage companies.',
    expertise: ['Incorporation', 'Fundraising', 'IP Protection'],
    rating: 4.9,
    completed_projects: 127,
    response_time: '< 2 hours',
  },
];
import type { ViewType } from '../../types/venturemate';

interface MarketplaceProps {
   
  onViewChange?: (_view: ViewType) => void;
}

const bookingSteps = ['Service Details', 'Project Requirements', 'Review & Confirm'];

export function MarketplacePage({ onViewChange: _onViewChange }: MarketplaceProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [activeTab, setActiveTab] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedService, setSelectedService] = useState<MarketplaceService | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  
  // Booking flow states
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [activeBookingStep, setActiveBookingStep] = useState(0);
  const [bookingForm, setBookingForm] = useState({
    projectTitle: '',
    budget: '',
    deadline: '',
    requirements: '',
    additionalNotes: '',
  });
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [newBooking, setNewBooking] = useState<ServiceBooking | null>(null);
  const [myBookings, setMyBookings] = useState<ServiceBooking[]>(serviceBookings);

  const filteredServices = selectedCategory === 'All' 
    ? marketplaceServices 
    : marketplaceServices.filter(s => s.category === selectedCategory);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#22c55e';
      case 'in_progress': return '#3b82f6';
      case 'accepted': return '#f59e0b';
      case 'pending': return '#6b7280';
      default: return '#6b7280';
    }
  };

  const handleViewService = (service: MarketplaceService) => {
    setSelectedService(service);
    setShowDetailModal(true);
  };

  const handleCloseModal = () => {
    setShowDetailModal(false);
    setSelectedService(null);
  };

  const handleStartBooking = () => {
    setShowDetailModal(false);
    setShowBookingModal(true);
    setActiveBookingStep(0);
    setBookingSuccess(false);
    setBookingForm({
      projectTitle: '',
      budget: '',
      deadline: '',
      requirements: '',
      additionalNotes: '',
    });
  };

  const handleCloseBooking = () => {
    setShowBookingModal(false);
    setActiveBookingStep(0);
    setBookingSuccess(false);
  };

  const handleNextStep = () => {
    if (activeBookingStep < bookingSteps.length - 1) {
      setActiveBookingStep(activeBookingStep + 1);
    }
  };

  const handlePrevStep = () => {
    if (activeBookingStep > 0) {
      setActiveBookingStep(activeBookingStep - 1);
    }
  };

  const handleSubmitBooking = () => {
    if (!selectedService) return;
    
    // Create new booking
    const booking: ServiceBooking = {
      id: `booking_${Date.now()}`,
      service_id: selectedService.id,
      service_title: selectedService.title,
      provider_name: selectedService.provider_name,
      status: 'pending',
      agreed_price: parseInt(bookingForm.budget) || selectedService.price_range.min,
      currency: selectedService.currency,
      deadline: bookingForm.deadline || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      requirements: bookingForm.requirements,
      created_at: new Date().toISOString(),
    };
    
    setNewBooking(booking);
    setMyBookings([booking, ...myBookings]);
    setBookingSuccess(true);
    setActiveBookingStep(0);
  };

  const isStepValid = () => {
    switch (activeBookingStep) {
      case 0:
        return bookingForm.projectTitle.trim() && bookingForm.budget.trim();
      case 1:
        return bookingForm.requirements.trim().length > 20;
      default:
        return true;
    }
  };

  return (
    <Box sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 4 }}>
        <Box>
          <Typography sx={{ fontSize: { xs: 22, sm: 28 }, fontWeight: 700, color: 'var(--vm-text-primary)', mb: 1 }}>
            Marketplace
          </Typography>
          <Typography sx={{ fontSize: { xs: 13, sm: 15, md: 16 }, color: 'var(--vm-text-muted)' }}>
            Find expert services for your startup
          </Typography>
        </Box>
      </Box>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onChange={(_, v) => setActiveTab(v)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{
          mb: 3,
          '& .MuiTabs-indicator': { bgcolor: 'var(--vm-primary-500)' },
          '& .MuiTab-root': {
            color: 'var(--vm-text-muted)',
            textTransform: 'none',
            fontSize: { xs: 13, sm: 14 },
            '&.Mui-selected': { color: 'var(--vm-primary-400)' },
          },
        }}
      >
        <Tab label="Services" />
        <Tab label="My Bookings" />
        <Tab label="Providers" />
      </Tabs>

      {/* Services Tab */}
      {activeTab === 0 && (
        <>
          {/* Categories */}
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 3 }}>
            {serviceCategories.map((category) => (
              <GradientButton
                key={category}
                size="sm"
                variant={selectedCategory === category ? 'primary' : 'outline'}
                onClick={() => setSelectedCategory(category)}
                sx={{
                  borderRadius: 2,
                  px: 2,
                  py: 0.5,
                  fontSize: 12,
                  ...(selectedCategory !== category && {
                    borderColor: 'var(--vm-border-subtle)',
                    color: 'var(--vm-text-secondary)',
                  }),
                }}
              >
                {category}
              </GradientButton>
            ))}
          </Box>

          {/* Services Grid */}
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: { xs: 2, md: 3 } }}>
            {filteredServices.map((service) => (
              <Card
                key={service.id}
                sx={{
                  bgcolor: 'var(--vm-bg-secondary)',
                  border: '1px solid var(--vm-border-subtle)',
                  borderRadius: 3,
                  p: 3,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar src={service.provider_avatar} sx={{ width: 48, height: 48 }}>
                      {service.provider_name[0]}
                    </Avatar>
                    <Box>
                      <Typography sx={{ fontSize: 14, fontWeight: 600, color: 'var(--vm-text-primary)' }}>
                        {service.provider_name}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Star size={12} color="#f59e0b" fill="#f59e0b" />
                        <Typography sx={{ fontSize: 12, color: 'var(--vm-text-muted)' }}>
                          {service.rating} ({service.review_count})
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                  <Chip
                    size="small"
                    label={service.category}
                    sx={{
                      bgcolor: 'var(--vm-bg-tertiary)',
                      color: 'var(--vm-text-secondary)',
                      fontSize: 10,
                      maxWidth: '100%',
                      '& .MuiChip-label': { whiteSpace: 'normal', py: 0.5 },
                    }}
                  />
                </Box>

                <Typography sx={{ fontSize: 16, fontWeight: 600, color: 'var(--vm-text-primary)', mb: 1 }}>
                  {service.title}
                </Typography>
                <Typography sx={{ fontSize: 13, color: 'var(--vm-text-secondary)', mb: 2, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                  {service.description}
                </Typography>

                <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap', maxWidth: '100%' }}>
                  {service.tags.map((tag) => (
                    <Chip
                      key={tag}
                      size="small"
                      label={tag}
                      sx={{
                        bgcolor: 'var(--vm-bg-tertiary)',
                        color: 'var(--vm-text-muted)',
                        fontSize: 10,
                        maxWidth: '100%',
                        '& .MuiChip-label': { whiteSpace: 'normal', py: 0.5 },
                      }}
                    />
                  ))}
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography sx={{ fontSize: 12, color: 'var(--vm-text-muted)' }}>
                      Starting at
                    </Typography>
                    <Typography sx={{ fontSize: 18, fontWeight: 700, color: 'var(--vm-primary-400)' }}>
                      ${service.price_range.min.toLocaleString()}
                    </Typography>
                  </Box>
                  <GradientButton variant="primary" size="sm" onClick={() => handleViewService(service)}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      View
                      <ArrowRight size={16} />
                    </Box>
                  </GradientButton>
                </Box>
              </Card>
            ))}
          </Box>
        </>
      )}

      {/* My Bookings Tab */}
      {activeTab === 1 && (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: { xs: 2, md: 3 } }}>
          {myBookings.map((booking) => (
            <Card
              key={booking.id}
              sx={{
                bgcolor: 'var(--vm-bg-secondary)',
                border: '1px solid var(--vm-border-subtle)',
                borderRadius: 3,
                p: 3,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Typography sx={{ fontSize: 16, fontWeight: 600, color: 'var(--vm-text-primary)' }}>
                  {booking.service_title}
                </Typography>
                 <Chip
                   size="small"
                   label={booking.status.replace('_', ' ')}
                   sx={{
                     bgcolor: `${getStatusColor(booking.status)}20`,
                     color: getStatusColor(booking.status),
                     fontSize: 10,
                     fontWeight: 600,
                     textTransform: 'capitalize',
                     maxWidth: '100%',
                     '& .MuiChip-label': { whiteSpace: 'normal', py: 0.5 },
                   }}
                 />
              </Box>

              <Typography sx={{ fontSize: 14, color: 'var(--vm-text-secondary)', mb: 2 }}>
                Provider: {booking.provider_name}
              </Typography>

              <Typography sx={{ fontSize: 20, fontWeight: 700, color: 'var(--vm-text-primary)', mb: 2 }}>
                ${booking.agreed_price.toLocaleString()}
              </Typography>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Calendar size={14} color="var(--vm-text-muted)" />
                <Typography sx={{ fontSize: 12, color: 'var(--vm-text-muted)' }}>
                  Deadline: {new Date(booking.deadline).toLocaleDateString('en-GB')}
                </Typography>
              </Box>

              <Typography sx={{ fontSize: 13, color: 'var(--vm-text-secondary)' }}>
                {booking.requirements}
              </Typography>
            </Card>
          ))}
        </Box>
      )}

      {/* Providers Tab */}
      {activeTab === 2 && (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }, gap: { xs: 2, md: 3 } }}>
          {serviceProviders.map((provider) => (
            <Card
              key={provider.id}
              sx={{
                bgcolor: 'var(--vm-bg-secondary)',
                border: '1px solid var(--vm-border-subtle)',
                borderRadius: 3,
                p: 3,
                textAlign: 'center',
              }}
            >
              <Avatar
                src={provider.avatar}
                sx={{ width: 80, height: 80, mx: 'auto', mb: 2 }}
              >
                {provider.name[0]}
              </Avatar>
              <Typography sx={{ fontSize: 16, fontWeight: 600, color: 'var(--vm-text-primary)', mb: 0.5 }}>
                {provider.name}
              </Typography>
              <Typography sx={{ fontSize: 13, color: 'var(--vm-text-muted)', mb: 2 }}>
                {provider.company}
              </Typography>
              <Typography sx={{ fontSize: 13, color: 'var(--vm-text-secondary)', mb: 2 }}>
                {provider.bio}
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                <Rating value={provider.rating} readOnly precision={0.1} size="small" />
              </Box>
              <Typography sx={{ fontSize: 12, color: 'var(--vm-text-muted)', mb: 2 }}>
                {provider.completed_projects} projects • {provider.response_time} response
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, justifyContent: 'center' }}>
                {provider.expertise.map((exp) => (
                  <Chip
                    key={tag}
                    size="small"
                    label={tag}
                    sx={{
                      bgcolor: 'var(--vm-bg-tertiary)',
                      color: 'var(--vm-text-muted)',
                      fontSize: 10,
                      maxWidth: '100%',
                      '& .MuiChip-label': { whiteSpace: 'normal', py: 0.5 },
                    }}
                  />
                ))}
              </Box>
            </Card>
          ))}
        </Box>
      )}

      {/* Service Detail Modal */}
      <Dialog 
        open={showDetailModal} 
        onClose={handleCloseModal}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: 'var(--vm-bg-secondary)',
            border: '1px solid var(--vm-border-subtle)',
            borderRadius: 3,
            maxHeight: '90vh',
          }
        }}
      >
        {selectedService && (
          <>
            {/* Header */}
            <DialogTitle sx={{ p: 3, pb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <Box>
                  <Typography sx={{ fontSize: 24, fontWeight: 700, color: 'var(--vm-text-primary)', mb: 1 }}>
                    {selectedService.title}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip
                      size="small"
                      label={selectedService.category}
                      sx={{
                        bgcolor: 'var(--vm-primary-900)',
                        color: 'var(--vm-primary-400)',
                        fontSize: 11,
                        fontWeight: 600,
                        maxWidth: '100%',
                        '& .MuiChip-label': { whiteSpace: 'normal', py: 0.5 },
                      }}
                    />
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Star size={14} color="#f59e0b" fill="#f59e0b" />
                      <Typography sx={{ fontSize: 13, color: 'var(--vm-text-secondary)' }}>
                        {selectedService.rating} ({selectedService.review_count} reviews)
                      </Typography>
                    </Box>
                  </Box>
                </Box>
                <GradientButton variant="outline" size="sm" onClick={handleCloseModal}>
                  <X size={18} />
                </GradientButton>
              </Box>
            </DialogTitle>

            <DialogContent sx={{ p: 3, pt: 0, overflow: 'auto' }}>
              {/* Provider Info */}
              <Card sx={{ bgcolor: 'var(--vm-bg-primary)', border: '1px solid var(--vm-border-subtle)', borderRadius: 2, p: 3, mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                  <Avatar src={selectedService.provider_avatar} sx={{ width: 64, height: 64 }}>
                    {selectedService.provider_name[0]}
                  </Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Typography sx={{ fontSize: 18, fontWeight: 600, color: 'var(--vm-text-primary)', mb: 0.5 }}>
                      {selectedService.provider_name}
                    </Typography>
                    <Typography sx={{ fontSize: 14, color: 'var(--vm-text-secondary)', mb: 1 }}>
                      {selectedService.provider_bio}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <MapPin size={14} color="var(--vm-text-muted)" />
                        <Typography sx={{ fontSize: 12, color: 'var(--vm-text-muted)' }}>
                          {selectedService.provider_location}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Globe size={14} color="var(--vm-text-muted)" />
                        <Typography sx={{ fontSize: 12, color: 'var(--vm-text-muted)' }}>
                          {selectedService.provider_languages.join(', ')}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Clock size={14} color="var(--vm-text-muted)" />
                        <Typography sx={{ fontSize: 12, color: 'var(--vm-text-muted)' }}>
                          Responds {selectedService.provider_response_time}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Briefcase size={14} color="var(--vm-text-muted)" />
                        <Typography sx={{ fontSize: 12, color: 'var(--vm-text-muted)' }}>
                          {selectedService.provider_completed_projects} projects completed
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                </Box>
              </Card>

              <Grid container spacing={3}>
                {/* Left Column */}
                <Grid size={{ xs: 12, md: 8 }}>
                  {/* Description */}
                  <Typography sx={{ fontSize: 16, fontWeight: 600, color: 'var(--vm-text-primary)', mb: 1.5 }}>
                    About This Service
                  </Typography>
                  <Typography sx={{ fontSize: 14, color: 'var(--vm-text-secondary)', mb: 3, lineHeight: 1.7 }}>
                    {selectedService.full_description}
                  </Typography>

                  {/* What's Included */}
                  <Typography sx={{ fontSize: 16, fontWeight: 600, color: 'var(--vm-text-primary)', mb: 1.5 }}>
                    What's Included
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 3 }}>
                    {selectedService.whats_included.map((item, idx) => (
                      <Box key={idx} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <CheckCircle size={16} color="#22c55e" />
                        <Typography sx={{ fontSize: 14, color: 'var(--vm-text-secondary)' }}>
                          {item}
                        </Typography>
                      </Box>
                    ))}
                  </Box>

                  {/* Requirements */}
                  <Typography sx={{ fontSize: 16, fontWeight: 600, color: 'var(--vm-text-primary)', mb: 1.5 }}>
                    What You'll Need to Provide
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 3 }}>
                    {selectedService.requirements.map((item, idx) => (
                      <Box key={idx} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'var(--vm-primary-500)' }} />
                        <Typography sx={{ fontSize: 14, color: 'var(--vm-text-secondary)' }}>
                          {item}
                        </Typography>
                      </Box>
                    ))}
                  </Box>

                  {/* Portfolio */}
                  {selectedService.portfolio.length > 0 && (
                    <>
                      <Typography sx={{ fontSize: 16, fontWeight: 600, color: 'var(--vm-text-primary)', mb: 1.5 }}>
                        Portfolio
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 3 }}>
                        {selectedService.portfolio.map((item, idx) => (
                          <Card
                            key={idx}
                            sx={{
                              bgcolor: 'var(--vm-bg-primary)',
                              border: '1px solid var(--vm-border-subtle)',
                              borderRadius: 2,
                              overflow: 'hidden',
                              width: 200,
                            }}
                          >
                            <Box
                              component="img"
                              src={item.image}
                              sx={{ width: '100%', height: 120, objectFit: 'cover' }}
                            />
                            <Box sx={{ p: 1.5 }}>
                              <Typography sx={{ fontSize: 13, fontWeight: 600, color: 'var(--vm-text-primary)' }}>
                                {item.title}
                              </Typography>
                              <Typography sx={{ fontSize: 11, color: 'var(--vm-text-muted)' }}>
                                {item.description}
                              </Typography>
                            </Box>
                          </Card>
                        ))}
                      </Box>
                    </>
                  )}

                  {/* Reviews */}
                  {selectedService.reviews.length > 0 && (
                    <>
                      <Typography sx={{ fontSize: 16, fontWeight: 600, color: 'var(--vm-text-primary)', mb: 1.5 }}>
                        Recent Reviews
                      </Typography>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {selectedService.reviews.map((review, idx) => (
                          <Card
                            key={idx}
                            sx={{
                              bgcolor: 'var(--vm-bg-primary)',
                              border: '1px solid var(--vm-border-subtle)',
                              borderRadius: 2,
                              p: 2,
                            }}
                          >
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                              <Avatar src={review.avatar} sx={{ width: 32, height: 32 }}>
                                {review.author[0]}
                              </Avatar>
                              <Box>
                                <Typography sx={{ fontSize: 13, fontWeight: 600, color: 'var(--vm-text-primary)' }}>
                                  {review.author}
                                </Typography>
                                <Typography sx={{ fontSize: 11, color: 'var(--vm-text-muted)' }}>
                                  {new Date(review.date).toLocaleDateString('en-GB')}
                                </Typography>
                              </Box>
                              <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <Star size={12} color="#f59e0b" fill="#f59e0b" />
                                <Typography sx={{ fontSize: 12, color: 'var(--vm-text-secondary)' }}>
                                  {review.rating}
                                </Typography>
                              </Box>
                            </Box>
                            <Typography sx={{ fontSize: 13, color: 'var(--vm-text-secondary)' }}>
                              {review.comment}
                            </Typography>
                          </Card>
                        ))}
                      </Box>
                    </>
                  )}
                </Grid>

                {/* Right Column - Pricing & CTA */}
                <Grid size={{ xs: 12, md: 4 }}>
                  <Card sx={{ bgcolor: 'var(--vm-bg-primary)', border: '1px solid var(--vm-border-subtle)', borderRadius: 2, p: 3, position: 'sticky', top: 0 }}>
                    <Typography sx={{ fontSize: 14, color: 'var(--vm-text-muted)', mb: 0.5 }}>
                      Starting at
                    </Typography>
                    <Typography sx={{ fontSize: 36, fontWeight: 700, color: 'var(--vm-text-primary)', mb: 1 }}>
                      ${selectedService.price_range.min.toLocaleString()}
                    </Typography>
                    <Typography sx={{ fontSize: 13, color: 'var(--vm-text-secondary)', mb: 2 }}>
                      to ${selectedService.price_range.max.toLocaleString()} {selectedService.currency}
                    </Typography>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3, p: 1.5, bgcolor: 'var(--vm-bg-tertiary)', borderRadius: 1 }}>
                      <Clock size={16} color="var(--vm-text-muted)" />
                      <Typography sx={{ fontSize: 13, color: 'var(--vm-text-secondary)' }}>
                        Delivery: {selectedService.delivery_time}
                      </Typography>
                    </Box>

                    <GradientButton variant="primary" size="lg" fullWidth sx={{ mb: 2 }} onClick={handleStartBooking}>
                      Get Started
                    </GradientButton>
                    <GradientButton variant="outline" size="md" fullWidth onClick={handleCloseModal}>
                      Contact Provider
                    </GradientButton>

                    <Box sx={{ mt: 3, pt: 3, borderTop: '1px solid var(--vm-border-subtle)' }}>
                      <Typography sx={{ fontSize: 12, color: 'var(--vm-text-muted)', textAlign: 'center' }}>
                        Protected by VentureMate Guarantee
                      </Typography>
                    </Box>
                  </Card>
                </Grid>
              </Grid>
            </DialogContent>
          </>
        )}
      </Dialog>

      {/* Booking Flow Modal */}
      <Dialog
        open={showBookingModal}
        onClose={handleCloseBooking}
        maxWidth="md"
        fullWidth
        fullScreen={isMobile}
        PaperProps={{
          sx: {
            bgcolor: 'var(--vm-bg-secondary)',
            border: '1px solid var(--vm-border-subtle)',
            borderRadius: 3,
            maxHeight: '90vh',
          }
        }}
      >
        {bookingSuccess && newBooking ? (
          // Success State
          <Box sx={{ p: 6, textAlign: 'center' }}>
            <Box
              sx={{
                width: 80,
                height: 80,
                borderRadius: '50%',
                bgcolor: 'rgba(34, 197, 94, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mx: 'auto',
                mb: 3,
              }}
            >
              <Check size={40} color="#22c55e" />
            </Box>
            <Typography sx={{ fontSize: 24, fontWeight: 700, color: 'var(--vm-text-primary)', mb: 2 }}>
              Booking Request Sent!
            </Typography>
            <Typography sx={{ fontSize: 15, color: 'var(--vm-text-secondary)', mb: 1 }}>
              Your request for <strong>{newBooking.service_title}</strong> has been sent to {newBooking.provider_name}.
            </Typography>
            <Typography sx={{ fontSize: 14, color: 'var(--vm-text-muted)', mb: 4 }}>
              Expected response within 24 hours
            </Typography>
            
            <Card sx={{ bgcolor: 'var(--vm-bg-primary)', border: '1px solid var(--vm-border-subtle)', borderRadius: 2, p: 3, mb: 4, maxWidth: 400, mx: 'auto' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography sx={{ fontSize: 13, color: 'var(--vm-text-muted)' }}>Booking ID</Typography>
                <Typography sx={{ fontSize: 13, fontWeight: 600, color: 'var(--vm-text-primary)' }}>{newBooking.id}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography sx={{ fontSize: 13, color: 'var(--vm-text-muted)' }}>Amount</Typography>
                <Typography sx={{ fontSize: 13, fontWeight: 600, color: 'var(--vm-text-primary)' }}>${newBooking.agreed_price.toLocaleString()}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography sx={{ fontSize: 13, color: 'var(--vm-text-muted)' }}>Status</Typography>
                <Chip
                  size="small"
                  label="Pending"
                  sx={{
                    bgcolor: '#6b728020',
                    color: '#6b7280',
                    fontSize: 10,
                    fontWeight: 600,
                    '& .MuiChip-label': { whiteSpace: 'normal', py: 0.5 },
                  }}
                />
              </Box>
            </Card>

            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
              <GradientButton variant="outline" size="md" onClick={handleCloseBooking}>
                Back to Marketplace
              </GradientButton>
              <GradientButton variant="primary" size="md" onClick={() => { handleCloseBooking(); setActiveTab(1); }}>
                View My Bookings
              </GradientButton>
            </Box>
          </Box>
        ) : (
          // Booking Form
          <>
            <DialogTitle sx={{ p: 3, pb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography sx={{ fontSize: 20, fontWeight: 700, color: 'var(--vm-text-primary)' }}>
                  Book Service
                </Typography>
                <GradientButton variant="outline" size="sm" onClick={handleCloseBooking}>
                  <X size={18} />
                </GradientButton>
              </Box>
            </DialogTitle>

            <DialogContent sx={{ p: 3, pt: 0 }}>
              {/* Stepper */}
              <Stepper activeStep={activeBookingStep} sx={{ mb: 4, mt: 2 }}>
                {bookingSteps.map((label) => (
                  <Step key={label}>
                    <StepLabel sx={{ 
                      '& .MuiStepLabel-label': { color: 'var(--vm-text-secondary)', fontSize: 12 },
                      '& .MuiStepLabel-label.Mui-active': { color: 'var(--vm-primary-400)' },
                      '& .MuiStepLabel-label.Mui-completed': { color: 'var(--vm-text-secondary)' },
                    }}>
                      {label}
                    </StepLabel>
                  </Step>
                ))}
              </Stepper>

              {/* Step 1: Service Details */}
              {activeBookingStep === 0 && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <Typography sx={{ fontSize: 16, fontWeight: 600, color: 'var(--vm-text-primary)' }}>
                    {selectedService?.title}
                  </Typography>
                  
                  <TextField
                    label="Project Title"
                    placeholder="e.g., Startup Legal Package for TechCorp"
                    value={bookingForm.projectTitle}
                    onChange={(e) => setBookingForm({ ...bookingForm, projectTitle: e.target.value })}
                    fullWidth
                    sx={{
                      '& .MuiInputBase-root': { bgcolor: 'var(--vm-bg-primary)', color: 'var(--vm-text-primary)' },
                      '& .MuiInputLabel-root': { color: 'var(--vm-text-muted)' },
                      '& .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--vm-border-primary)' },
                    }}
                  />

                  <TextField
                    label="Your Budget"
                    type="number"
                    placeholder={`Min: $${selectedService?.price_range.min.toLocaleString()}`}
                    value={bookingForm.budget}
                    onChange={(e) => setBookingForm({ ...bookingForm, budget: e.target.value })}
                    fullWidth
                    InputProps={{ startAdornment: <Typography sx={{ color: 'var(--vm-text-muted)', mr: 1 }}>$</Typography> }}
                    sx={{
                      '& .MuiInputBase-root': { bgcolor: 'var(--vm-bg-primary)', color: 'var(--vm-text-primary)' },
                      '& .MuiInputLabel-root': { color: 'var(--vm-text-muted)' },
                      '& .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--vm-border-primary)' },
                    }}
                  />

                  <DatePicker label="Desired Deadline" format="dd/MM/yyyy"
                    value={bookingForm.deadline ? new Date(bookingForm.deadline) : null}
                    onChange={(date) => setBookingForm({ ...bookingForm, deadline: date ? date.toISOString().split('T')[0] : '' })}
                    slotProps={{ textField: { fullWidth: true, sx: {
                      '& .MuiInputBase-root': { bgcolor: 'var(--vm-bg-primary)', color: 'var(--vm-text-primary)' },
                      '& .MuiInputLabel-root': { color: 'var(--vm-text-muted)' },
                      '& .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--vm-border-primary)' },
                    } } }}
                  />
                </Box>
              )}

              {/* Step 2: Project Requirements */}
              {activeBookingStep === 1 && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <Typography sx={{ fontSize: 14, color: 'var(--vm-text-secondary)' }}>
                    Describe your project requirements in detail. Be specific about deliverables, timeline, and any special requests.
                  </Typography>
                  
                  <TextField
                    label="Project Requirements"
                    placeholder="Describe what you need..."
                    value={bookingForm.requirements}
                    onChange={(e) => setBookingForm({ ...bookingForm, requirements: e.target.value })}
                    fullWidth
                    multiline
                    rows={6}
                    sx={{
                      '& .MuiInputBase-root': { bgcolor: 'var(--vm-bg-primary)', color: 'var(--vm-text-primary)' },
                      '& .MuiInputLabel-root': { color: 'var(--vm-text-muted)' },
                      '& .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--vm-border-primary)' },
                    }}
                  />

                  <TextField
                    label="Additional Notes (Optional)"
                    placeholder="Any other details the provider should know..."
                    value={bookingForm.additionalNotes}
                    onChange={(e) => setBookingForm({ ...bookingForm, additionalNotes: e.target.value })}
                    fullWidth
                    multiline
                    rows={3}
                    sx={{
                      '& .MuiInputBase-root': { bgcolor: 'var(--vm-bg-primary)', color: 'var(--vm-text-primary)' },
                      '& .MuiInputLabel-root': { color: 'var(--vm-text-muted)' },
                      '& .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--vm-border-primary)' },
                    }}
                  />
                </Box>
              )}

              {/* Step 3: Review & Confirm */}
              {activeBookingStep === 2 && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <Typography sx={{ fontSize: 16, fontWeight: 600, color: 'var(--vm-text-primary)', mb: 1 }}>
                    Review Your Booking
                  </Typography>

                  <Card sx={{ bgcolor: 'var(--vm-bg-primary)', border: '1px solid var(--vm-border-subtle)', borderRadius: 2, p: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3, pb: 2, borderBottom: '1px solid var(--vm-border-subtle)' }}>
                      <Avatar src={selectedService?.provider_avatar} sx={{ width: 48, height: 48 }}>
                        {selectedService?.provider_name[0]}
                      </Avatar>
                      <Box>
                        <Typography sx={{ fontSize: 15, fontWeight: 600, color: 'var(--vm-text-primary)' }}>
                          {selectedService?.title}
                        </Typography>
                        <Typography sx={{ fontSize: 13, color: 'var(--vm-text-muted)' }}>
                          by {selectedService?.provider_name}
                        </Typography>
                      </Box>
                    </Box>

                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography sx={{ fontSize: 13, color: 'var(--vm-text-muted)' }}>Project</Typography>
                        <Typography sx={{ fontSize: 13, fontWeight: 500, color: 'var(--vm-text-primary)', textAlign: 'right', maxWidth: '60%' }}>
                          {bookingForm.projectTitle}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography sx={{ fontSize: 13, color: 'var(--vm-text-muted)' }}>Budget</Typography>
                        <Typography sx={{ fontSize: 13, fontWeight: 600, color: 'var(--vm-primary-400)' }}>
                          ${parseInt(bookingForm.budget || '0').toLocaleString()}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography sx={{ fontSize: 13, color: 'var(--vm-text-muted)' }}>Deadline</Typography>
                        <Typography sx={{ fontSize: 13, fontWeight: 500, color: 'var(--vm-text-primary)' }}>
                          {bookingForm.deadline ? new Date(bookingForm.deadline).toLocaleDateString('en-GB') : 'Not specified'}
                        </Typography>
                      </Box>
                    </Box>
                  </Card>

                  <Card sx={{ bgcolor: 'var(--vm-bg-primary)', border: '1px solid var(--vm-border-subtle)', borderRadius: 2, p: 3 }}>
                    <Typography sx={{ fontSize: 14, fontWeight: 600, color: 'var(--vm-text-primary)', mb: 1 }}>
                      Requirements
                    </Typography>
                    <Typography sx={{ fontSize: 13, color: 'var(--vm-text-secondary)', whiteSpace: 'pre-wrap' }}>
                      {bookingForm.requirements}
                    </Typography>
                  </Card>
                </Box>
              )}

              {/* Navigation Buttons */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4, pt: 3, borderTop: '1px solid var(--vm-border-subtle)' }}>
                <GradientButton
                  variant="outline"
                  size="md"
                  onClick={activeBookingStep === 0 ? handleCloseBooking : handlePrevStep}
                >
                  {activeBookingStep === 0 ? 'Cancel' : 'Back'}
                </GradientButton>
                
                {activeBookingStep === bookingSteps.length - 1 ? (
                  <GradientButton
                    variant="primary"
                    size="md"
                    onClick={handleSubmitBooking}
                  >
                    Confirm & Send Request
                  </GradientButton>
                ) : (
                  <GradientButton
                    variant="primary"
                    size="md"
                    onClick={handleNextStep}
                    disabled={!isStepValid()}
                  >
                    Continue
                  </GradientButton>
                )}
              </Box>
            </DialogContent>
          </>
        )}
      </Dialog>
    </Box>
  );
}
