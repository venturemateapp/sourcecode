// Export all data
export * from './user';
export * from './businesses';
export * from './network';
export * from './aiTools';
export * from './crm';
export * from './banking';
export * from './social';
export * from './marketplace';
// Export specific items to avoid naming conflicts
export { 
  creditScore, 
  creditHistory, 
  financingOffers, 
  financingApplications,
  getScoreGrade,
  getRiskLabel 
} from './creditScore';
export type { 
  CreditScore, 
  CreditScoreHistory, 
  FinancingOffer, 
  FinancingApplication 
} from './creditScore';

export * from './healthScore';
export * from './websiteBuilder';
export * from './subscription';
export * from './healthScore';
export * from './documents';

// Dashboard stats computed from data
import { businesses } from './businesses';
import { investors, cofounders, conversations } from './network';
import { aiTools } from './aiTools';

export const dashboardStats = {
  totalBusinesses: businesses.length,
  activeBusinesses: businesses.filter(b => b.status === 'active').length,
  totalMilestones: businesses.reduce((acc, b) => acc + b.milestones.length, 0),
  completedMilestones: businesses.reduce((acc, b) => acc + b.milestones.filter(m => m.status === 'completed').length, 0),
  totalDocuments: businesses.reduce((acc, b) => acc + b.documents.length, 0),
  totalFundingRaised: businesses.reduce((acc, b) => acc + b.financials.fundingRaised, 0),
  totalMRR: businesses.reduce((acc, b) => acc + b.financials.revenue.currentMRR, 0),
  investorMatches: investors.filter(i => i.matchScore && i.matchScore > 80).length,
  cofounderMatches: cofounders.filter(c => c.matchScore && c.matchScore > 80).length,
  unreadMessages: conversations.reduce((acc, c) => acc + c.unreadCount, 0),
  aiToolsUsed: aiTools.reduce((acc, t) => acc + t.usageCount, 0),
};
