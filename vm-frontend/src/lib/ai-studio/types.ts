export type AIProjectType = 'web_app' | 'pitch_deck' | 'business_plan';

export interface AIProject {
  id: string;
  businessId?: string;
  projectType: AIProjectType;
  name: string;
  slug: string;
  status: 'draft' | 'published' | 'archived' | string;
  framework?: string;
  templateVersion?: string;
  currentRevisionId?: string;
  approvedRevisionId?: string;
  settings: string;
  metadata: string;
  createdAt: string;
  updatedAt: string;
}

export interface AIProjectRevision {
  id: string;
  projectId: string;
  parentRevisionId?: string;
  source: string;
  prompt: string;
  summary: string;
  status: 'pending' | 'approved' | 'rejected' | string;
  schemaVersion: string;
  document: string;
  manifest: string;
  diagnostics: string;
  tokenUsage: string;
  contentHash: string;
  createdAt: string;
  updatedAt: string;
}

export interface AIProjectFile {
  id?: string;
  projectId: string;
  path: string;
  language: string;
  isBinary: boolean;
  assetId?: string;
  currentContent: string;
  contentHash: string;
  sizeBytes: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface AIGenerationJob {
  id: string;
  businessId?: string;
  projectId?: string;
  artifactType: string;
  jobType: string;
  status: 'queued' | 'running' | 'awaiting_review' | 'completed' | 'failed' | 'cancelled' | string;
  progress: number;
  step: string;
  message: string;
  request: string;
  result: string;
  errorCode: string;
  errorMessage: string;
  logs: string;
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  attemptCount: number;
  maxAttempts: number;
  cancelRequested: boolean;
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  completedAt?: string;
}

export interface AIAsset {
  id: string;
  businessId?: string;
  projectId?: string;
  source: string;
  kind: string;
  prompt: string;
  model: string;
  style: string;
  mimeType: string;
  width?: number;
  height?: number;
  sizeBytes: number;
  storageKey: string;
  url: string;
  thumbnailUrl: string;
  metadata: string;
  createdAt: string;
  updatedAt: string;
}

export interface AIProjectBuild {
  id: string;
  projectId: string;
  revisionId?: string;
  jobId?: string;
  status: string;
  runtimeVersion: string;
  artifactStorageKey: string;
  previewUrl: string;
  diagnostics: string;
  logs: string;
  createdAt: string;
  updatedAt: string;
}

export interface AIProjectDeployment {
  id: string;
  projectId: string;
  revisionId?: string;
  buildId?: string;
  jobId?: string;
  provider: string;
  status: string;
  externalId: string;
  url: string;
  metadata: string;
  logs: string;
  createdAt: string;
  updatedAt: string;
}

export interface DeckTheme {
  primary: string;
  secondary: string;
  background: string;
  surface: string;
  text: string;
  mutedText: string;
  headingFont: string;
  bodyFont: string;
}

export interface DeckElement {
  id: string;
  type: 'text' | 'image' | 'shape' | 'icon' | 'chart' | 'table' | 'line' | 'group';
  x: number;
  y: number;
  w: number;
  h: number;
  rotation?: number;
  zIndex: number;
  visible: boolean;
  locked: boolean;
  altText?: string;
  link?: string;
  text?: string;
  url?: string;
  assetId?: string;
  shape?: string;
  chart?: Record<string, unknown>;
  table?: Record<string, unknown>;
  children?: DeckElement[];
  style?: Record<string, unknown>;
}

export interface DeckSlide {
  id: string;
  type: string;
  title: string;
  background: { type: string; color?: string; url?: string; assetId?: string };
  elements: DeckElement[];
  notes: string;
  order: number;
  locked?: boolean;
  layoutId?: string;
}

export interface DeckDocument {
  schemaVersion: '2.0';
  title: string;
  template: string;
  theme: DeckTheme;
  slides: DeckSlide[];
  metadata?: Record<string, unknown>;
}

export interface PlanBlock {
  id: string;
  type: string;
  text?: string;
  level?: number;
  items?: string[];
  rows?: string[][];
  headers?: string[];
  assetId?: string;
  url?: string;
  altText?: string;
  chart?: Record<string, unknown>;
  data?: Record<string, unknown>;
  style?: Record<string, unknown>;
  locked?: boolean;
  pageBreakBefore?: boolean;
}

export interface PlanSectionV2 {
  id: string;
  title: string;
  order: number;
  locked?: boolean;
  notes?: string;
  blocks: PlanBlock[];
}

export interface PlanDocumentV2 {
  schemaVersion: '2.0';
  title: string;
  executiveSummary: string;
  metadata: { businessId?: string; versionLabel: string; currency: string; preparedAt: string };
  sections: PlanSectionV2[];
  assumptions?: Array<{ id: string; label: string; value: number; unit: string; description?: string; source: string }>;
  projection?: Record<string, unknown>;
  theme?: Record<string, unknown>;
}
