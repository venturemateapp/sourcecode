// Documents Data - Helper functions and document templates
import type { Document } from '../types/venturemate';
import { businesses } from './businesses';

// Get all documents across all businesses
export const getAllDocuments = (): (Document & { businessId: string; businessName: string })[] => {
  return businesses.flatMap(b => 
    b.documents.map(d => ({
      ...d,
      businessId: b.id,
      businessName: b.name,
    }))
  );
};

// Get documents for a specific business
export const getDocumentsByBusinessId = (businessId: string): Document[] => {
  const business = businesses.find(b => b.id === businessId);
  return business?.documents || [];
};

// Get document by ID
export const getDocumentById = (documentId: string): (Document & { businessId?: string }) | undefined => {
  for (const business of businesses) {
    const doc = business.documents.find(d => d.id === documentId);
    if (doc) return { ...doc, businessId: business.id };
  }
  return undefined;
};

// Document categories with icons and colors
export const documentCategories = [
  { id: 'legal', label: 'Legal', color: '#3b82f6', icon: 'Scale' },
  { id: 'financial', label: 'Financial', color: '#22c55e', icon: 'DollarSign' },
  { id: 'marketing', label: 'Marketing', color: '#f59e0b', icon: 'Megaphone' },
  { id: 'product', label: 'Product', color: '#8b5cf6', icon: 'Box' },
  { id: 'hr', label: 'HR & Team', color: '#ec4899', icon: 'Users' },
  { id: 'other', label: 'Other', color: '#6b7280', icon: 'File' },
] as const;

// File type icons and colors
export const fileTypeConfig: Record<string, { icon: string; color: string; bgColor: string }> = {
  pdf: { icon: 'FileText', color: '#ef4444', bgColor: '#fef2f2' },
  docx: { icon: 'FileText', color: '#3b82f6', bgColor: '#eff6ff' },
  xlsx: { icon: 'Table', color: '#22c55e', bgColor: '#f0fdf4' },
  pptx: { icon: 'Presentation', color: '#f97316', bgColor: '#fff7ed' },
  image: { icon: 'Image', color: '#8b5cf6', bgColor: '#f5f3ff' },
  other: { icon: 'File', color: '#6b7280', bgColor: '#f3f4f6' },
};

// Document templates for quick creation
export const documentTemplates = [
  {
    id: 'template_001',
    name: 'Founder Agreement',
    description: 'Standard founder agreement template',
    category: 'legal' as const,
    type: 'docx' as const,
    icon: 'FileText',
  },
  {
    id: 'template_002',
    name: 'Pitch Deck Template',
    description: 'Investor-ready pitch deck structure',
    category: 'marketing' as const,
    type: 'pptx' as const,
    icon: 'Presentation',
  },
  {
    id: 'template_003',
    name: 'Financial Model',
    description: '3-year financial projections template',
    category: 'financial' as const,
    type: 'xlsx' as const,
    icon: 'Table',
  },
  {
    id: 'template_004',
    name: 'Employee Offer Letter',
    description: 'Standard employment offer letter',
    category: 'hr' as const,
    type: 'docx' as const,
    icon: 'FileText',
  },
  {
    id: 'template_005',
    name: 'NDA Template',
    description: 'Mutual non-disclosure agreement',
    category: 'legal' as const,
    type: 'docx' as const,
    icon: 'FileText',
  },
  {
    id: 'template_006',
    name: 'Product Spec',
    description: 'Product specification document',
    category: 'product' as const,
    type: 'docx' as const,
    icon: 'FileText',
  },
];

// Recent document activity
export const getRecentDocuments = (limit = 10) => {
  return getAllDocuments()
    .sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime())
    .slice(0, limit);
};

// Get document stats for a business
export const getDocumentStats = (businessId: string) => {
  const docs = getDocumentsByBusinessId(businessId);
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
};

// Search documents
export const searchDocuments = (query: string, businessId?: string) => {
  const docs = businessId ? getDocumentsByBusinessId(businessId) : getAllDocuments();
  const searchTerm = query.toLowerCase();
  
  return docs.filter((doc: Document) =>
    doc.name.toLowerCase().includes(searchTerm) ||
    doc.tags.some(tag => tag.toLowerCase().includes(searchTerm)) ||
    doc.category.toLowerCase().includes(searchTerm)
  );
};
