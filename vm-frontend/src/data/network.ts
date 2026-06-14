// Investors & Co-founders Data
import type { Investor, CoFounder, Conversation } from '../types/venturemate';

const img = (n: number) => `/img${n}.jpeg`;

export const investors: Investor[] = [
  {
    id: 'inv_001',
    name: 'Sequoia Capital',
    type: 'vc',
    logo: img(1),
    location: 'Menlo Park, CA',
    focusIndustries: ['AI/ML', 'SaaS', 'Fintech', 'Healthcare'],
    stages: ['seed', 'series-a', 'series-b', 'series-c'],
    checkSize: { min: 1000000, max: 100000000 },
    aum: 85000000000,
    portfolio: [
      { name: 'Apple', logo: img(1), industry: 'Technology', stage: 'ipo', exit: 'ipo' },
      { name: 'Google', logo: img(2), industry: 'Technology', stage: 'ipo', exit: 'ipo' },
      { name: 'Stripe', logo: img(3), industry: 'Fintech', stage: 'series-c' },
      { name: 'Airbnb', logo: img(4), industry: 'Marketplace', stage: 'ipo', exit: 'ipo' }
    ],
    team: [
      { id: 'it_001', name: 'Roelof Botha', role: 'Partner', avatar: img(1) },
      { id: 'it_002', name: 'Alfred Lin', role: 'Partner', avatar: img(2) }
    ],
    thesis: 'Backing bold founders building category-defining companies',
    criteria: ['Strong technical team', 'Large market opportunity', 'Clear path to monopoly'],
    matchScore: 92,
    status: 'connected',
    connectedAt: '2024-03-15T00:00:00Z'
  },
  {
    id: 'inv_002',
    name: 'Andreessen Horowitz',
    type: 'vc',
    logo: img(2),
    location: 'Menlo Park, CA',
    focusIndustries: ['Crypto', 'AI/ML', 'Enterprise', 'Consumer'],
    stages: ['seed', 'series-a', 'series-b', 'series-c'],
    checkSize: { min: 500000, max: 50000000 },
    aum: 35000000000,
    portfolio: [
      { name: 'Facebook', logo: img(1), industry: 'Social', stage: 'ipo', exit: 'ipo' },
      { name: 'Coinbase', logo: img(2), industry: 'Crypto', stage: 'ipo', exit: 'ipo' },
      { name: 'Figma', logo: img(3), industry: 'Design', stage: 'acquired', exit: 'acquired' }
    ],
    team: [
      { id: 'it_003', name: 'Marc Andreessen', role: 'Co-founder', avatar: img(1) },
      { id: 'it_004', name: 'Ben Horowitz', role: 'Co-founder', avatar: img(2) }
    ],
    thesis: 'Software is eating the world',
    criteria: ['Technical founders', 'Network effects', 'Software margins'],
    matchScore: 88,
    status: 'pending'
  },
  {
    id: 'inv_003',
    name: 'Naval Ravikant',
    type: 'angel',
    logo: img(3),
    location: 'San Francisco, CA',
    focusIndustries: ['AI/ML', 'Crypto', 'SaaS'],
    stages: ['pre-seed', 'seed'],
    checkSize: { min: 100000, max: 500000 },
    portfolio: [
      { name: 'Twitter', logo: img(1), industry: 'Social', stage: 'ipo', exit: 'ipo' },
      { name: 'Uber', logo: img(2), industry: 'Transportation', stage: 'ipo', exit: 'ipo' },
      { name: 'Notion', logo: img(3), industry: 'Productivity', stage: 'series-c' }
    ],
    team: [{ id: 'it_005', name: 'Naval Ravikant', role: 'Angel Investor', avatar: img(4) }],
    thesis: 'Investing in founders with deep obsession and unique insights',
    criteria: ['Founder-market fit', 'Authentic mission', 'Long-term thinking'],
    matchScore: 85,
    status: 'not-connected'
  },
  {
    id: 'inv_004',
    name: 'Bessemer Venture Partners',
    type: 'vc',
    logo: img(4),
    location: 'San Francisco, CA',
    focusIndustries: ['SaaS', 'Cloud', 'Healthcare', 'Marketplace'],
    stages: ['seed', 'series-a', 'series-b'],
    checkSize: { min: 500000, max: 25000000 },
    aum: 20000000000,
    portfolio: [
      { name: 'Shopify', logo: img(1), industry: 'E-commerce', stage: 'ipo', exit: 'ipo' },
      { name: 'LinkedIn', logo: img(2), industry: 'Social', stage: 'ipo', exit: 'acquired' },
      { name: 'Twilio', logo: img(3), industry: 'Cloud', stage: 'ipo', exit: 'ipo' }
    ],
    team: [
      { id: 'it_006', name: 'Byron Deeter', role: 'Partner', avatar: img(1) },
      { id: 'it_007', name: 'Mary DOnofrio', role: 'Partner', avatar: img(2) }
    ],
    thesis: 'Partnering with cloud-native founders from inception to IPO',
    criteria: ['Cloud-first architecture', 'Product-led growth', 'Strong unit economics'],
    matchScore: 79,
    status: 'not-connected'
  },
  {
    id: 'inv_005',
    name: 'First Round Capital',
    type: 'vc',
    logo: img(1),
    location: 'San Francisco, CA',
    focusIndustries: ['Consumer', 'Enterprise', 'Fintech', 'Healthcare'],
    stages: ['pre-seed', 'seed'],
    checkSize: { min: 250000, max: 3000000 },
    aum: 5000000000,
    portfolio: [
      { name: 'Uber', logo: img(1), industry: 'Transportation', stage: 'ipo', exit: 'ipo' },
      { name: 'Square', logo: img(2), industry: 'Fintech', stage: 'ipo', exit: 'ipo' },
      { name: 'Roblox', logo: img(3), industry: 'Gaming', stage: 'ipo', exit: 'ipo' }
    ],
    team: [
      { id: 'it_008', name: 'Josh Kopelman', role: 'Partner', avatar: img(1) },
      { id: 'it_009', name: 'Bill Trenchard', role: 'Partner', avatar: img(2) }
    ],
    thesis: 'The best first check for the best founders',
    criteria: ['Strong founder-team fit', 'Clear differentiation', 'Early traction'],
    matchScore: 91,
    status: 'pending'
  },
  {
    id: 'inv_006',
    name: 'Accel Partners',
    type: 'vc',
    logo: img(2),
    location: 'Palo Alto, CA',
    focusIndustries: ['SaaS', 'Security', 'Fintech', 'Consumer'],
    stages: ['seed', 'series-a', 'series-b'],
    checkSize: { min: 500000, max: 50000000 },
    aum: 25000000000,
    portfolio: [
      { name: 'Slack', logo: img(1), industry: 'Enterprise', stage: 'acquired', exit: 'acquired' },
      { name: 'Spotify', logo: img(2), industry: 'Consumer', stage: 'ipo', exit: 'ipo' },
      { name: 'CrowdStrike', logo: img(3), industry: 'Security', stage: 'ipo', exit: 'ipo' }
    ],
    team: [
      { id: 'it_010', name: 'Philippe Botteri', role: 'Partner', avatar: img(1) },
      { id: 'it_011', name: 'Arun Mathew', role: 'Partner', avatar: img(2) }
    ],
    thesis: 'Partnering early with exceptional founders',
    criteria: ['Visionary founders', 'Scalable product', 'Global ambition'],
    matchScore: 84,
    status: 'not-connected'
  },
  {
    id: 'inv_007',
    name: 'Khosla Ventures',
    type: 'vc',
    logo: img(3),
    location: 'Menlo Park, CA',
    focusIndustries: ['AI/ML', 'Climate', 'Robotics', 'Healthcare'],
    stages: ['seed', 'series-a', 'series-b'],
    checkSize: { min: 1000000, max: 100000000 },
    aum: 15000000000,
    portfolio: [
      { name: 'OpenAI', logo: img(1), industry: 'AI/ML', stage: 'series-c' },
      { name: 'DoorDash', logo: img(2), industry: 'Marketplace', stage: 'ipo', exit: 'ipo' },
      { name: 'Instacart', logo: img(3), industry: 'Marketplace', stage: 'ipo', exit: 'ipo' }
    ],
    team: [
      { id: 'it_012', name: 'Vinod Khosla', role: 'Founder', avatar: img(1) },
      { id: 'it_013', name: 'Sven Strohband', role: 'Partner', avatar: img(2) }
    ],
    thesis: 'Investing in bold, impactful technology that changes the world',
    criteria: ['Disruptive technology', 'Ambitious founders', 'Large TAM'],
    matchScore: 89,
    status: 'pending'
  },
  {
    id: 'inv_008',
    name: 'Greylock Partners',
    type: 'vc',
    logo: img(4),
    location: 'Menlo Park, CA',
    focusIndustries: ['Enterprise', 'Consumer', 'AI/ML', 'Marketplace'],
    stages: ['seed', 'series-a', 'series-b'],
    checkSize: { min: 500000, max: 25000000 },
    aum: 18000000000,
    portfolio: [
      { name: 'LinkedIn', logo: img(1), industry: 'Social', stage: 'ipo', exit: 'ipo' },
      { name: 'Workday', logo: img(2), industry: 'Enterprise', stage: 'ipo', exit: 'ipo' },
      { name: 'Airbnb', logo: img(3), industry: 'Marketplace', stage: 'ipo', exit: 'ipo' }
    ],
    team: [
      { id: 'it_014', name: 'Reid Hoffman', role: 'Partner', avatar: img(1) },
      { id: 'it_015', name: 'Sarah Guo', role: 'Partner', avatar: img(2) }
    ],
    thesis: 'Building iconic companies that shape the future',
    criteria: ['Network effects', 'Strong founder-market fit', 'Scalable platform'],
    matchScore: 87,
    status: 'connected',
    connectedAt: '2024-02-10T00:00:00Z'
  },
  {
    id: 'inv_009',
    name: 'Lightspeed Venture Partners',
    type: 'vc',
    logo: img(1),
    location: 'Menlo Park, CA',
    focusIndustries: ['Enterprise', 'Consumer', 'Fintech', 'Healthcare'],
    stages: ['seed', 'series-a', 'series-b', 'series-c'],
    checkSize: { min: 500000, max: 75000000 },
    aum: 25000000000,
    portfolio: [
      { name: 'Snap', logo: img(1), industry: 'Social', stage: 'ipo', exit: 'ipo' },
      { name: 'Affirm', logo: img(2), industry: 'Fintech', stage: 'ipo', exit: 'ipo' },
      { name: 'Rubrik', logo: img(3), industry: 'Enterprise', stage: 'ipo', exit: 'ipo' }
    ],
    team: [
      { id: 'it_016', name: 'Ravi Mhatre', role: 'Partner', avatar: img(1) },
      { id: 'it_017', name: 'Peter Nieh', role: 'Partner', avatar: img(2) }
    ],
    thesis: 'Supporting founders from seed to scale',
    criteria: ['Category creation', 'Operational excellence', 'Global expansion'],
    matchScore: 81,
    status: 'not-connected'
  },
  {
    id: 'inv_010',
    name: 'Index Ventures',
    type: 'vc',
    logo: img(2),
    location: 'San Francisco, CA',
    focusIndustries: ['SaaS', 'Fintech', 'Gaming', 'Marketplace'],
    stages: ['seed', 'series-a', 'series-b'],
    checkSize: { min: 500000, max: 50000000 },
    aum: 15000000000,
    portfolio: [
      { name: 'Figma', logo: img(1), industry: 'Design', stage: 'acquired', exit: 'acquired' },
      { name: 'Discord', logo: img(2), industry: 'Social', stage: 'series-c' },
      { name: 'Deliveroo', logo: img(3), industry: 'Marketplace', stage: 'ipo', exit: 'ipo' }
    ],
    team: [
      { id: 'it_018', name: 'Danny Rimer', role: 'Partner', avatar: img(1) },
      { id: 'it_019', name: 'Sarah Cannon', role: 'Partner', avatar: img(2) }
    ],
    thesis: 'Backing entrepreneurs with global ambitions',
    criteria: ['Product-market fit', 'Strong network effects', 'Exceptional team'],
    matchScore: 83,
    status: 'pending'
  },
  {
    id: 'inv_011',
    name: 'Y Combinator',
    type: 'accelerator',
    logo: img(3),
    location: 'Mountain View, CA',
    focusIndustries: ['AI/ML', 'SaaS', 'Fintech', 'Consumer', 'Healthcare'],
    stages: ['pre-seed', 'seed'],
    checkSize: { min: 500000, max: 1000000 },
    portfolio: [
      { name: 'Airbnb', logo: img(1), industry: 'Marketplace', stage: 'ipo', exit: 'ipo' },
      { name: 'Dropbox', logo: img(2), industry: 'SaaS', stage: 'ipo', exit: 'ipo' },
      { name: 'Stripe', logo: img(3), industry: 'Fintech', stage: 'series-c' }
    ],
    team: [
      { id: 'it_020', name: 'Garry Tan', role: 'CEO', avatar: img(1) },
      { id: 'it_021', name: 'Jared Friedman', role: 'Partner', avatar: img(2) }
    ],
    thesis: 'Helping startups build something people want',
    criteria: ['Technical founders', 'Fast iteration', 'Strong growth potential'],
    matchScore: 96,
    status: 'connected',
    connectedAt: '2024-01-15T00:00:00Z'
  },
  {
    id: 'inv_012',
    name: 'Tiger Global Management',
    type: 'vc',
    logo: img(4),
    location: 'New York, NY',
    focusIndustries: ['Internet', 'SaaS', 'Fintech', 'Consumer'],
    stages: ['series-a', 'series-b', 'series-c'],
    checkSize: { min: 5000000, max: 500000000 },
    aum: 95000000000,
    portfolio: [
      { name: 'Meta', logo: img(1), industry: 'Social', stage: 'ipo', exit: 'ipo' },
      { name: 'Byjus', logo: img(2), industry: 'EdTech', stage: 'series-f' },
      { name: 'Flipkart', logo: img(3), industry: 'E-commerce', stage: 'acquired', exit: 'acquired' }
    ],
    team: [
      { id: 'it_022', name: 'Scott Shleifer', role: 'Partner', avatar: img(1) },
      { id: 'it_023', name: 'John Curtius', role: 'Partner', avatar: img(2) }
    ],
    thesis: 'Investing in the best internet companies globally',
    criteria: ['Rapid growth', 'Large TAM', 'Capital efficiency'],
    matchScore: 75,
    status: 'not-connected'
  },
  {
    id: 'inv_013',
    name: 'Founders Fund',
    type: 'vc',
    logo: img(1),
    location: 'San Francisco, CA',
    focusIndustries: ['AI/ML', 'Aerospace', 'Biotech', 'Defense'],
    stages: ['seed', 'series-a', 'series-b'],
    checkSize: { min: 1000000, max: 100000000 },
    aum: 12000000000,
    portfolio: [
      { name: 'SpaceX', logo: img(1), industry: 'Aerospace', stage: 'private' },
      { name: 'Palantir', logo: img(2), industry: 'Enterprise', stage: 'ipo', exit: 'ipo' },
      { name: 'Anduril', logo: img(3), industry: 'Defense', stage: 'series-e' }
    ],
    team: [
      { id: 'it_024', name: 'Peter Thiel', role: 'Partner', avatar: img(1) },
      { id: 'it_025', name: 'Keith Rabois', role: 'Partner', avatar: img(2) }
    ],
    thesis: 'We wanted flying cars, instead we got 140 characters',
    criteria: ['Transformational technology', 'Contrarian thinking', 'World-class founders'],
    matchScore: 80,
    status: 'pending'
  },
  {
    id: 'inv_014',
    name: 'Spark Capital',
    type: 'vc',
    logo: img(2),
    location: 'Boston, MA',
    focusIndustries: ['Consumer', 'Enterprise', 'Fintech', 'Media'],
    stages: ['seed', 'series-a', 'series-b'],
    checkSize: { min: 500000, max: 35000000 },
    aum: 10000000000,
    portfolio: [
      { name: 'Twitter', logo: img(1), industry: 'Social', stage: 'ipo', exit: 'ipo' },
      { name: 'Slack', logo: img(2), industry: 'Enterprise', stage: 'acquired', exit: 'acquired' },
      { name: 'Coinbase', logo: img(3), industry: 'Crypto', stage: 'ipo', exit: 'ipo' }
    ],
    team: [
      { id: 'it_026', name: 'Bijan Sabet', role: 'General Partner', avatar: img(1) },
      { id: 'it_027', name: 'Santo Politi', role: 'General Partner', avatar: img(2) }
    ],
    thesis: 'Investing in product-minded founders',
    criteria: ['Product obsession', 'Design excellence', 'Community-driven growth'],
    matchScore: 82,
    status: 'not-connected'
  },
  {
    id: 'inv_015',
    name: 'Lux Capital',
    type: 'vc',
    logo: img(3),
    location: 'New York, NY',
    focusIndustries: ['Deep Tech', 'Robotics', 'AI/ML', 'Healthcare'],
    stages: ['seed', 'series-a', 'series-b'],
    checkSize: { min: 500000, max: 50000000 },
    aum: 8000000000,
    portfolio: [
      { name: 'Ring', logo: img(1), industry: 'Consumer', stage: 'acquired', exit: 'acquired' },
      { name: 'Kurion', logo: img(2), industry: 'Energy', stage: 'acquired', exit: 'acquired' },
      { name: 'Formlabs', logo: img(3), industry: 'Hardware', stage: 'series-f' }
    ],
    team: [
      { id: 'it_028', name: 'Josh Wolfe', role: 'Managing Partner', avatar: img(1) },
      { id: 'it_029', name: 'Peter Hebert', role: 'Partner', avatar: img(2) }
    ],
    thesis: 'Investing in science and technology ventures',
    criteria: ['Technical differentiation', 'IP moat', 'Visionary scientists'],
    matchScore: 77,
    status: 'pending'
  },
  {
    id: 'inv_016',
    name: 'Ribbit Capital',
    type: 'vc',
    logo: img(4),
    location: 'Palo Alto, CA',
    focusIndustries: ['Fintech', 'InsurTech', 'Crypto'],
    stages: ['seed', 'series-a', 'series-b'],
    checkSize: { min: 500000, max: 50000000 },
    aum: 6000000000,
    portfolio: [
      { name: 'Robinhood', logo: img(1), industry: 'Fintech', stage: 'ipo', exit: 'ipo' },
      { name: 'Affirm', logo: img(2), industry: 'Fintech', stage: 'ipo', exit: 'ipo' },
      { name: 'Coinbase', logo: img(3), industry: 'Crypto', stage: 'ipo', exit: 'ipo' }
    ],
    team: [
      { id: 'it_030', name: 'Meyer Malka', role: 'Managing Partner', avatar: img(1) },
      { id: 'it_031', name: 'Nick Shalek', role: 'Partner', avatar: img(2) }
    ],
    thesis: 'Reimagining financial services through technology',
    criteria: ['Regulatory expertise', 'Network effects', 'Strong risk management'],
    matchScore: 73,
    status: 'not-connected'
  },
  {
    id: 'inv_017',
    name: 'Sapphire Ventures',
    type: 'vc',
    logo: img(1),
    location: 'Austin, TX',
    focusIndustries: ['SaaS', 'Enterprise', 'Fintech', 'Healthcare'],
    stages: ['series-a', 'series-b', 'series-c'],
    checkSize: { min: 10000000, max: 100000000 },
    aum: 14000000000,
    portfolio: [
      { name: 'Alteryx', logo: img(1), industry: 'Enterprise', stage: 'ipo', exit: 'ipo' },
      { name: 'Box', logo: img(2), industry: 'Enterprise', stage: 'ipo', exit: 'ipo' },
      { name: 'DocuSign', logo: img(3), industry: 'SaaS', stage: 'ipo', exit: 'ipo' }
    ],
    team: [
      { id: 'it_032', name: 'Jai Das', role: 'President', avatar: img(1) },
      { id: 'it_033', name: 'Rajeev Dham', role: 'Partner', avatar: img(2) }
    ],
    thesis: 'Partnering with visionary founders building enduring businesses',
    criteria: ['Enterprise-ready product', 'Strong leadership', 'Sustainable growth'],
    matchScore: 78,
    status: 'pending'
  },
  {
    id: 'inv_018',
    name: '8VC',
    type: 'vc',
    logo: img(2),
    location: 'Austin, TX',
    focusIndustries: ['Enterprise', 'Healthcare', 'Logistics', 'Fintech'],
    stages: ['seed', 'series-a', 'series-b'],
    checkSize: { min: 500000, max: 50000000 },
    aum: 6000000000,
    portfolio: [
      { name: 'Qualia', logo: img(1), industry: 'PropTech', stage: 'series-d' },
      { name: 'Esper', logo: img(2), industry: 'Enterprise', stage: 'series-c' },
      { name: 'Olive', logo: img(3), industry: 'Healthcare', stage: 'series-h' }
    ],
    team: [
      { id: 'it_034', name: 'Joe Lonsdale', role: 'Managing Partner', avatar: img(1) },
      { id: 'it_035', name: 'Alex Kolicich', role: 'Partner', avatar: img(2) }
    ],
    thesis: 'Transforming legacy industries through technology',
    criteria: ['Domain expertise', 'Operational excellence', 'Scalable platform'],
    matchScore: 76,
    status: 'not-connected'
  },
  {
    id: 'inv_019',
    name: 'Bessemer Trust Family Office',
    type: 'family-office',
    logo: img(3),
    location: 'New York, NY',
    focusIndustries: ['Healthcare', 'Real Estate', 'Fintech', 'Consumer'],
    stages: ['series-b', 'series-c'],
    checkSize: { min: 5000000, max: 50000000 },
    aum: 150000000000,
    portfolio: [
      { name: 'One Medical', logo: img(1), industry: 'Healthcare', stage: 'acquired', exit: 'acquired' },
      { name: 'Compass', logo: img(2), industry: 'Real Estate', stage: 'ipo', exit: 'ipo' }
    ],
    team: [
      { id: 'it_036', name: 'Andrew Friedman', role: 'Managing Director', avatar: img(1) },
      { id: 'it_037', name: 'Margaret Chen', role: 'Principal', avatar: img(2) }
    ],
    thesis: 'Long-term capital for exceptional businesses',
    criteria: ['Proven business model', 'Strong management', 'Sustainable competitive advantage'],
    matchScore: 71,
    status: 'not-connected'
  },
  {
    id: 'inv_020',
    name: 'Salesforce Ventures',
    type: 'corporate',
    logo: img(4),
    location: 'San Francisco, CA',
    focusIndustries: ['SaaS', 'Enterprise', 'AI/ML', 'Customer Success'],
    stages: ['seed', 'series-a', 'series-b', 'series-c'],
    checkSize: { min: 250000, max: 25000000 },
    aum: 5000000000,
    portfolio: [
      { name: 'DocuSign', logo: img(1), industry: 'SaaS', stage: 'ipo', exit: 'ipo' },
      { name: 'Zoom', logo: img(2), industry: 'Enterprise', stage: 'ipo', exit: 'ipo' },
      { name: 'OwnBackup', logo: img(3), industry: 'SaaS', stage: 'acquired', exit: 'acquired' }
    ],
    team: [
      { id: 'it_038', name: 'Alex Kayyal', role: 'Managing Partner', avatar: img(1) },
      { id: 'it_039', name: 'Lori Krauss', role: 'Partner', avatar: img(2) }
    ],
    thesis: 'Strategic investments that extend the Salesforce ecosystem',
    criteria: ['CRM adjacency', 'Enterprise traction', 'Product integration potential'],
    matchScore: 86,
    status: 'pending'
  },
  {
    id: 'inv_021',
    name: 'Benchmark Capital',
    type: 'vc',
    logo: img(1),
    location: 'San Francisco, CA',
    focusIndustries: ['SaaS', 'Marketplace', 'Consumer', 'Fintech'],
    stages: ['seed', 'series-a'],
    checkSize: { min: 500000, max: 15000000 },
    aum: 9000000000,
    portfolio: [
      { name: 'eBay', logo: img(1), industry: 'Marketplace', stage: 'ipo', exit: 'ipo' },
      { name: 'Twitter', logo: img(2), industry: 'Social', stage: 'ipo', exit: 'ipo' },
      { name: 'Snap', logo: img(3), industry: 'Social', stage: 'ipo', exit: 'ipo' }
    ],
    team: [
      { id: 'it_040', name: 'Bill Gurley', role: 'Partner', avatar: img(1) },
      { id: 'it_041', name: 'Mitch Lasky', role: 'Partner', avatar: img(2) }
    ],
    thesis: 'Backing category-defining companies at the earliest stages',
    criteria: ['Founder-market fit', 'Network effects', 'Scalable model'],
    matchScore: 90,
    status: 'connected',
    connectedAt: '2024-03-20T00:00:00Z'
  },
  {
    id: 'inv_022',
    name: 'Thrive Capital',
    type: 'vc',
    logo: img(2),
    location: 'New York, NY',
    focusIndustries: ['Internet', 'Fintech', 'Healthcare', 'Consumer'],
    stages: ['seed', 'series-a', 'series-b'],
    checkSize: { min: 1000000, max: 100000000 },
    aum: 13000000000,
    portfolio: [
      { name: 'Instagram', logo: img(1), industry: 'Social', stage: 'acquired', exit: 'acquired' },
      { name: 'Spotify', logo: img(2), industry: 'Consumer', stage: 'ipo', exit: 'ipo' },
      { name: 'Stripe', logo: img(3), industry: 'Fintech', stage: 'series-c' }
    ],
    team: [
      { id: 'it_042', name: 'Josh Kushner', role: 'Founder', avatar: img(1) },
      { id: 'it_043', name: 'Kareem Zaki', role: 'Partner', avatar: img(2) }
    ],
    thesis: 'Investing in companies that improve how people live and work',
    criteria: ['Product obsession', 'Consumer insight', 'Operational excellence'],
    matchScore: 88,
    status: 'pending'
  },
  {
    id: 'inv_023',
    name: 'Union Square Ventures',
    type: 'vc',
    logo: img(3),
    location: 'New York, NY',
    focusIndustries: ['Crypto', 'SaaS', 'Consumer', 'Climate'],
    stages: ['seed', 'series-a'],
    checkSize: { min: 250000, max: 10000000 },
    aum: 7000000000,
    portfolio: [
      { name: 'Twitter', logo: img(1), industry: 'Social', stage: 'ipo', exit: 'ipo' },
      { name: 'Etsy', logo: img(2), industry: 'Marketplace', stage: 'ipo', exit: 'ipo' },
      { name: 'Coinbase', logo: img(3), industry: 'Crypto', stage: 'ipo', exit: 'ipo' }
    ],
    team: [
      { id: 'it_044', name: 'Fred Wilson', role: 'Managing Partner', avatar: img(1) },
      { id: 'it_045', name: 'Albert Wenger', role: 'Managing Partner', avatar: img(2) }
    ],
    thesis: 'Investing in large networks of engaged users',
    criteria: ['Network effects', 'Open protocols', 'Strong community'],
    matchScore: 85,
    status: 'not-connected'
  },
  {
    id: 'inv_024',
    name: 'SoftBank Vision Fund',
    type: 'pe',
    logo: img(4),
    location: 'London, UK',
    focusIndustries: ['AI/ML', 'Robotics', 'Transportation', 'Fintech'],
    stages: ['series-c', 'series-d'],
    checkSize: { min: 100000000, max: 10000000000 },
    aum: 100000000000,
    portfolio: [
      { name: 'ARM', logo: img(1), industry: 'Semiconductors', stage: 'ipo', exit: 'ipo' },
      { name: 'WeWork', logo: img(2), industry: 'Real Estate', stage: 'ipo', exit: 'ipo' },
      { name: 'Uber', logo: img(3), industry: 'Transportation', stage: 'ipo', exit: 'ipo' }
    ],
    team: [
      { id: 'it_046', name: 'Masayoshi Son', role: 'CEO', avatar: img(1) },
      { id: 'it_047', name: 'Vikas Parekh', role: 'Managing Partner', avatar: img(2) }
    ],
    thesis: 'Funding the AI revolution and information age',
    criteria: ['Market leadership', 'Disruptive technology', 'Global scale'],
    matchScore: 68,
    status: 'not-connected'
  },
  {
    id: 'inv_025',
    name: 'Techstars',
    type: 'accelerator',
    logo: img(1),
    location: 'Boulder, CO',
    focusIndustries: ['SaaS', 'Fintech', 'Healthcare', 'Climate', 'Consumer'],
    stages: ['pre-seed', 'seed'],
    checkSize: { min: 100000, max: 500000 },
    portfolio: [
      { name: 'SendGrid', logo: img(1), industry: 'SaaS', stage: 'ipo', exit: 'ipo' },
      { name: 'DigitalOcean', logo: img(2), industry: 'Cloud', stage: 'ipo', exit: 'ipo' },
      { name: 'ClassPass', logo: img(3), industry: 'Consumer', stage: 'acquired', exit: 'acquired' }
    ],
    team: [
      { id: 'it_048', name: 'David Cohen', role: 'Co-CEO', avatar: img(1) },
      { id: 'it_049', name: 'Maëlle Gavet', role: 'CEO', avatar: img(2) }
    ],
    thesis: 'Helping entrepreneurs succeed through mentorship and network',
    criteria: ['Coachable founders', 'Strong team dynamics', 'Clear problem-solution fit'],
    matchScore: 93,
    status: 'connected',
    connectedAt: '2024-04-01T00:00:00Z'
  }
];

export const cofounders: CoFounder[] = [
  {
    id: 'cf_001',
    userId: 'usr_101',
    name: 'Sarah Kim',
    avatar: img(1),
    location: 'San Francisco, CA',
    title: 'Engineering Leader',
    bio: 'Ex-OpenAI research engineer. PhD Stanford AI. Built large-scale ML systems at Google.',
    skills: ['Machine Learning', 'Python', 'TensorFlow', 'System Design', 'Team Leadership'],
    lookingFor: ['AI Startup', 'Pre-seed/Seed', 'Full-time', 'Technical co-founder'],
    availability: 'full-time',
    commitment: 'co-founder',
    previousExperience: [
      { id: 'exp_101', company: 'OpenAI', role: 'Research Engineer', duration: '2021-2024', description: 'GPT-4 training infrastructure' },
      { id: 'exp_102', company: 'Google Brain', role: 'Software Engineer', duration: '2018-2021', description: 'Core ML infrastructure' }
    ],
    education: [
      { id: 'edu_101', institution: 'Stanford University', degree: 'PhD', field: 'Computer Science (AI)', year: '2018' },
      { id: 'edu_102', institution: 'MIT', degree: 'BS', field: 'Computer Science', year: '2013' }
    ],
    matchScore: 95,
    status: 'connected',
    linkedIn: 'linkedin.com/in/sarahkim',
    github: 'github.com/sarahkim'
  },
  {
    id: 'cf_002',
    userId: 'usr_102',
    name: 'David Park',
    avatar: img(2),
    location: 'New York, NY',
    title: 'Product Manager',
    bio: 'Former PM at Stripe and Notion. Led payments and collaboration products.',
    skills: ['Product Strategy', 'User Research', 'Growth', 'Payments', 'API Design'],
    lookingFor: ['Fintech', 'Productivity', 'Series A or earlier', 'Full-time'],
    availability: 'full-time',
    commitment: 'co-founder',
    previousExperience: [
      { id: 'exp_103', company: 'Stripe', role: 'Senior PM', duration: '2020-2024', description: 'Led payments platform' },
      { id: 'exp_104', company: 'Notion', role: 'Product Manager', duration: '2018-2020', description: 'Growth features' }
    ],
    education: [
      { id: 'edu_103', institution: 'Harvard Business School', degree: 'MBA', field: 'Business', year: '2018' },
      { id: 'edu_104', institution: 'UC Berkeley', degree: 'BS', field: 'Computer Science', year: '2013' }
    ],
    matchScore: 78,
    status: 'not-connected',
    linkedIn: 'linkedin.com/in/davidpark'
  },
  {
    id: 'cf_003',
    userId: 'usr_103',
    name: 'Emily Chen',
    avatar: img(3),
    location: 'Los Angeles, CA',
    title: 'Growth Marketer',
    bio: 'Led growth at 3 unicorns. Expert in paid acquisition and viral loops.',
    skills: ['Growth Marketing', 'Paid Acquisition', 'SEO', 'Viral Loops', 'Analytics'],
    lookingFor: ['Consumer', 'Marketplace', 'Health & Wellness', 'Pre-seed to Series B'],
    availability: 'full-time',
    commitment: 'early-employee',
    previousExperience: [
      { id: 'exp_105', company: 'DoorDash', role: 'Head of Growth', duration: '2021-2024', description: '$1B to $15B GMV' },
      { id: 'exp_106', company: 'Calm', role: 'Growth Lead', duration: '2019-2021', description: '1M to 10M users' }
    ],
    education: [
      { id: 'edu_105', institution: 'Wharton', degree: 'BS', field: 'Economics', year: '2015' }
    ],
    matchScore: 72,
    status: 'pending',
    linkedIn: 'linkedin.com/in/emilychen'
  },
  {
    id: 'cf_004',
    userId: 'usr_104',
    name: 'Marcus Johnson',
    avatar: img(4),
    location: 'Austin, TX',
    title: 'Full-Stack Engineer',
    bio: 'Ex-Meta engineer. Built real-time collaboration tools at Dropbox. Passionate about developer experience.',
    skills: ['React', 'TypeScript', 'Node.js', 'GraphQL', 'AWS'],
    lookingFor: ['B2B SaaS', 'Developer Tools', 'Seed to Series A', 'Full-time'],
    availability: 'full-time',
    commitment: 'co-founder',
    previousExperience: [
      { id: 'exp_107', company: 'Meta', role: 'Software Engineer', duration: '2019-2023', description: 'Messenger infrastructure' },
      { id: 'exp_108', company: 'Dropbox', role: 'Senior Engineer', duration: '2023-2024', description: 'Real-time sync engine' }
    ],
    education: [
      { id: 'edu_106', institution: 'UT Austin', degree: 'BS', field: 'Computer Science', year: '2019' }
    ],
    matchScore: 88,
    status: 'pending',
    linkedIn: 'linkedin.com/in/marcusjohnson',
    github: 'github.com/marcusj'
  },
  {
    id: 'cf_005',
    userId: 'usr_105',
    name: 'Priya Sharma',
    avatar: img(1),
    location: 'Seattle, WA',
    title: 'AI Research Scientist',
    bio: 'PhD in NLP from UW. Published 20+ papers. Built conversational AI at Amazon Alexa.',
    skills: ['NLP', 'PyTorch', 'Transformers', 'Speech Recognition', 'Research'],
    lookingFor: ['AI Startup', 'Voice/Conversational AI', 'Pre-seed to Seed', 'Full-time'],
    availability: 'full-time',
    commitment: 'co-founder',
    previousExperience: [
      { id: 'exp_109', company: 'Amazon', role: 'Applied Scientist', duration: '2020-2024', description: 'Alexa conversational AI' },
      { id: 'exp_110', company: 'Allen Institute for AI', role: 'Research Intern', duration: '2018-2020', description: 'Foundation models' }
    ],
    education: [
      { id: 'edu_107', institution: 'University of Washington', degree: 'PhD', field: 'Computer Science (NLP)', year: '2020' },
      { id: 'edu_108', institution: 'IIT Delhi', degree: 'BTech', field: 'Computer Science', year: '2015' }
    ],
    matchScore: 91,
    status: 'not-connected',
    linkedIn: 'linkedin.com/in/priyasharma',
    github: 'github.com/priyasharma'
  },
  {
    id: 'cf_006',
    userId: 'usr_106',
    name: 'James Wilson',
    avatar: img(2),
    location: 'Miami, FL',
    title: 'Sales Leader',
    bio: 'Ex-Salesforce AE. Closed $50M+ in ARR. Deep network in fintech and insurtech.',
    skills: ['Enterprise Sales', 'GTM Strategy', 'Pipeline Management', 'Negotiation', 'Team Building'],
    lookingFor: ['Fintech', 'InsurTech', 'B2B SaaS', 'Series A+', 'Full-time'],
    availability: 'full-time',
    commitment: 'early-employee',
    previousExperience: [
      { id: 'exp_111', company: 'Salesforce', role: 'Enterprise AE', duration: '2018-2024', description: 'Top 1% performer, $50M+ closed' },
      { id: 'exp_112', company: 'Oracle', role: 'Account Executive', duration: '2015-2018', description: 'Mid-market SaaS sales' }
    ],
    education: [
      { id: 'edu_109', institution: 'Florida State University', degree: 'BS', field: 'Business Administration', year: '2015' }
    ],
    matchScore: 74,
    status: 'connected',
    linkedIn: 'linkedin.com/in/jameswilson'
  },
  {
    id: 'cf_007',
    userId: 'usr_107',
    name: 'Aisha Patel',
    avatar: img(3),
    location: 'Chicago, IL',
    title: 'Designer & Creative Director',
    bio: 'Ex-Apple designer. Led design systems for 3 products. Obsessed with craft and accessibility.',
    skills: ['UI/UX Design', 'Design Systems', 'Figma', 'Motion Design', 'Brand Strategy'],
    lookingFor: ['Consumer', 'HealthTech', 'Climate Tech', 'Seed to Series B', 'Full-time'],
    availability: 'full-time',
    commitment: 'co-founder',
    previousExperience: [
      { id: 'exp_113', company: 'Apple', role: 'Product Designer', duration: '2019-2023', description: 'iOS design system' },
      { id: 'exp_114', company: 'IDEO', role: 'Interaction Designer', duration: '2016-2019', description: 'Healthcare innovation' }
    ],
    education: [
      { id: 'edu_110', institution: 'Rhode Island School of Design', degree: 'BFA', field: 'Industrial Design', year: '2016' }
    ],
    matchScore: 86,
    status: 'pending',
    linkedIn: 'linkedin.com/in/aishapatel',
    portfolio: 'aishapatel.design'
  },
  {
    id: 'cf_008',
    userId: 'usr_108',
    name: 'Tyler Brooks',
    avatar: img(4),
    location: 'Denver, CO',
    title: 'DevOps & Platform Engineer',
    bio: 'Ex-Netflix SRE. Built multi-region Kubernetes platforms. Passionate about reliability engineering.',
    skills: ['Kubernetes', 'Terraform', 'AWS', 'Go', 'Site Reliability Engineering'],
    lookingFor: ['Infrastructure', 'DevTools', 'B2B SaaS', 'Seed to Series A', 'Full-time'],
    availability: 'full-time',
    commitment: 'early-employee',
    previousExperience: [
      { id: 'exp_115', company: 'Netflix', role: 'Senior SRE', duration: '2019-2024', description: 'Global streaming platform' },
      { id: 'exp_116', company: 'Shopify', role: 'Platform Engineer', duration: '2017-2019', description: 'Merchant infrastructure' }
    ],
    education: [
      { id: 'edu_111', institution: 'CU Boulder', degree: 'BS', field: 'Computer Science', year: '2017' }
    ],
    matchScore: 79,
    status: 'not-connected',
    linkedIn: 'linkedin.com/in/tylerbrooks',
    github: 'github.com/tylerb'
  }
];

export const conversations: Conversation[] = [
  {
    id: 'conv_001',
    participants: [
      { id: 'usr_001', name: 'Alex Chen', avatar: img(1), role: 'founder' },
      { id: 'inv_001', name: 'Sequoia Capital', avatar: img(1), role: 'investor' }
    ],
    type: 'direct',
    lastMessage: {
      id: 'msg_001',
      senderId: 'inv_001',
      content: 'Thanks for sharing the deck. We would love to schedule a partner meeting next week.',
      type: 'text',
      timestamp: '2024-04-03T18:30:00Z',
      readBy: ['usr_001']
    },
    unreadCount: 0,
    updatedAt: '2024-04-03T18:30:00Z',
    businessId: 'biz_001'
  },
  {
    id: 'conv_002',
    participants: [
      { id: 'usr_001', name: 'Alex Chen', avatar: img(1), role: 'founder' },
      { id: 'usr_101', name: 'Sarah Kim', avatar: img(1), role: 'cofounder' }
    ],
    type: 'direct',
    lastMessage: {
      id: 'msg_002',
      senderId: 'usr_101',
      content: 'I have some ideas for the ML pipeline. Can we discuss tomorrow?',
      type: 'text',
      timestamp: '2024-04-04T05:00:00Z',
      readBy: []
    },
    unreadCount: 1,
    updatedAt: '2024-04-04T05:00:00Z',
    businessId: 'biz_001'
  },
  {
    id: 'conv_003',
    type: 'direct',
    participants: [
      { id: 'usr_001', name: 'Alex Chen', avatar: img(1), role: 'founder' },
      { id: 'inv_021', name: 'Benchmark Capital', avatar: img(1), role: 'investor' }
    ],
    lastMessage: {
      id: 'msg_003',
      senderId: 'inv_021',
      content: 'Your traction looks solid. Lets set up a call with the full partnership.',
      type: 'text',
      timestamp: '2024-04-02T14:00:00Z',
      readBy: ['usr_001']
    },
    unreadCount: 0,
    updatedAt: '2024-04-02T14:00:00Z',
    businessId: 'biz_001'
  },
  {
    id: 'conv_004',
    type: 'group',
    title: 'NeuroTask Core Team',
    participants: [
      { id: 'usr_001', name: 'Alex Chen', avatar: img(1), role: 'founder' },
      { id: 'usr_002', name: 'Sarah Kim', avatar: img(2), role: 'cofounder' },
      { id: 'usr_003', name: 'Mike Johnson', avatar: img(3), role: 'cofounder' }
    ],
    lastMessage: {
      id: 'msg_004',
      senderId: 'usr_002',
      content: 'Deployed the new ML model. 15% improvement in accuracy!',
      type: 'text',
      timestamp: '2024-04-03T22:00:00Z',
      readBy: ['usr_001', 'usr_003']
    },
    unreadCount: 0,
    updatedAt: '2024-04-03T22:00:00Z',
    businessId: 'biz_001'
  },
  {
    id: 'conv_005',
    type: 'group',
    title: 'GreenCart Founders Circle',
    participants: [
      { id: 'usr_001', name: 'Alex Chen', avatar: img(1), role: 'founder' },
      { id: 'cf_004', name: 'Marcus Johnson', avatar: img(4), role: 'cofounder' },
      { id: 'cf_007', name: 'Aisha Patel', avatar: img(3), role: 'cofounder' }
    ],
    lastMessage: {
      id: 'msg_005',
      senderId: 'cf_007',
      content: 'I have some initial brand concepts. Sharing the Figma link now.',
      type: 'text',
      timestamp: '2024-04-01T10:00:00Z',
      readBy: ['usr_001']
    },
    unreadCount: 1,
    updatedAt: '2024-04-01T10:00:00Z',
    businessId: 'biz_002'
  }
];

export const getInvestorById = (id: string) => investors.find(i => i.id === id);
export const getCoFounderById = (id: string) => cofounders.find(c => c.id === id);
