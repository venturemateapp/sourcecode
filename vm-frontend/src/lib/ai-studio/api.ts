import { graphqlRequest } from '../api';
import { API_CONFIG } from '../constants';
import { getToken } from '../auth';
import type {
  AIAsset, AIGenerationJob, AIProject, AIProjectBuild, AIProjectDeployment,
  AIProjectFile, AIProjectRevision, AIProjectType,
} from './types';

const PROJECT_FIELDS = `id businessId projectType name slug status framework templateVersion currentRevisionId approvedRevisionId settings metadata createdAt updatedAt`;
const REVISION_FIELDS = `id projectId parentRevisionId source prompt summary status schemaVersion document manifest diagnostics tokenUsage contentHash createdAt updatedAt`;
const JOB_FIELDS = `id businessId projectId artifactType jobType status progress step message request result errorCode errorMessage logs provider model inputTokens outputTokens attemptCount maxAttempts cancelRequested createdAt updatedAt startedAt completedAt`;
const BUILD_FIELDS = `id projectId revisionId jobId status runtimeVersion artifactStorageKey previewUrl diagnostics logs createdAt updatedAt`;

export async function listAIProjects(businessId?: string, projectType?: AIProjectType): Promise<AIProject[]> {
  const query = `query AIProjects($businessId: ID, $projectType: String) { aiProjects(businessId: $businessId, projectType: $projectType) { ${PROJECT_FIELDS} } }`;
  const data = await graphqlRequest<{ aiProjects: AIProject[] }>(query, { businessId: businessId || null, projectType: projectType || null });
  return data.aiProjects;
}

export async function getAIProject(id: string): Promise<AIProject | null> {
  const query = `query AIProject($id: ID!) { aiProject(id: $id) { ${PROJECT_FIELDS} } }`;
  const data = await graphqlRequest<{ aiProject: AIProject | null }>(query, { id });
  return data.aiProject;
}

export async function createAIProject(name: string, projectType: AIProjectType, businessId?: string): Promise<AIProject> {
  const mutation = `mutation CreateAIProject($name: String!, $projectType: String!, $businessId: ID) { createAiProject(name: $name, projectType: $projectType, businessId: $businessId) { ${PROJECT_FIELDS} } }`;
  const data = await graphqlRequest<{ createAiProject: AIProject }>(mutation, { name, projectType, businessId: businessId || null });
  return data.createAiProject;
}

export async function renameAIProject(projectId: string, name: string): Promise<AIProject> {
  const mutation = `mutation RenameAIProject($projectId: ID!, $name: String!) { renameAiProject(projectId: $projectId, name: $name) { ${PROJECT_FIELDS} } }`;
  const data = await graphqlRequest<{ renameAiProject: AIProject }>(mutation, { projectId, name });
  return data.renameAiProject;
}

export async function listAIProjectFiles(projectId: string): Promise<AIProjectFile[]> {
  const query = `query AIProjectFiles($projectId: ID!) { aiProjectFiles(projectId: $projectId) { id projectId path language isBinary assetId currentContent contentHash sizeBytes createdAt updatedAt } }`;
  const data = await graphqlRequest<{ aiProjectFiles: AIProjectFile[] }>(query, { projectId });
  return data.aiProjectFiles;
}

export async function listAIRevisions(projectId: string): Promise<AIProjectRevision[]> {
  const query = `query AIRevisions($projectId: ID!) { aiProjectRevisions(projectId: $projectId) { ${REVISION_FIELDS} } }`;
  const data = await graphqlRequest<{ aiProjectRevisions: AIProjectRevision[] }>(query, { projectId });
  return data.aiProjectRevisions;
}

export async function createAIRevision(input: {
  projectId: string; summary: string; document?: string; manifest?: string; schemaVersion?: string;
  fileChanges?: Array<{ path: string; operation: string; content?: string; baseHash?: string; language?: string }>;
}): Promise<AIProjectRevision> {
  const mutation = `mutation CreateAIRevision($projectId: ID!, $summary: String!, $document: String, $manifest: String, $fileChanges: String, $schemaVersion: String) { createAiRevision(projectId: $projectId, summary: $summary, document: $document, manifest: $manifest, fileChanges: $fileChanges, schemaVersion: $schemaVersion) { ${REVISION_FIELDS} } }`;
  const data = await graphqlRequest<{ createAiRevision: AIProjectRevision }>(mutation, {
    projectId: input.projectId, summary: input.summary, document: input.document || null,
    manifest: input.manifest || null, schemaVersion: input.schemaVersion || null,
    fileChanges: input.fileChanges ? JSON.stringify(input.fileChanges) : null,
  });
  return data.createAiRevision;
}

export async function updateAIProjectFile(projectId: string, file: AIProjectFile, content: string, summary: string): Promise<AIProjectRevision> {
  const mutation = `mutation UpdateAIProjectFile($projectId: ID!, $path: String!, $content: String!, $baseHash: String, $summary: String) { updateAiProjectFile(projectId: $projectId, path: $path, content: $content, baseHash: $baseHash, summary: $summary) { ${REVISION_FIELDS} } }`;
  const data = await graphqlRequest<{ updateAiProjectFile: AIProjectRevision }>(mutation, { projectId, path: file.path, content, baseHash: file.contentHash, summary });
  return data.updateAiProjectFile;
}

export async function approveAIRevision(revisionId: string): Promise<AIProject> {
  const mutation = `mutation ApproveAIRevision($revisionId: ID!) { approveAiRevision(revisionId: $revisionId) { ${PROJECT_FIELDS} } }`;
  const data = await graphqlRequest<{ approveAiRevision: AIProject }>(mutation, { revisionId });
  return data.approveAiRevision;
}

export async function rollbackAIProject(projectId: string, revisionId: string): Promise<AIProjectRevision> {
  const mutation = `mutation RollbackAIProject($projectId: ID!, $revisionId: ID!) { rollbackAiProject(projectId: $projectId, revisionId: $revisionId) { ${REVISION_FIELDS} } }`;
  const data = await graphqlRequest<{ rollbackAiProject: AIProjectRevision }>(mutation, { projectId, revisionId });
  return data.rollbackAiProject;
}

export async function startAIGeneration(projectId: string, prompt: string, projection?: Record<string, unknown>): Promise<AIGenerationJob> {
  const mutation = `mutation StartAIGeneration($projectId: ID!, $prompt: String!, $projection: String) { startAiGeneration(projectId: $projectId, prompt: $prompt, projection: $projection) { ${JOB_FIELDS} } }`;
  const data = await graphqlRequest<{ startAiGeneration: AIGenerationJob }>(mutation, { projectId, prompt, projection: projection ? JSON.stringify(projection) : null });
  return data.startAiGeneration;
}

export async function listAIJobs(projectId?: string, status?: string): Promise<AIGenerationJob[]> {
  const query = `query AIJobs($projectId: ID, $status: String) { aiGenerationJobs(projectId: $projectId, status: $status) { ${JOB_FIELDS} } }`;
  const data = await graphqlRequest<{ aiGenerationJobs: AIGenerationJob[] }>(query, { projectId: projectId || null, status: status || null });
  return data.aiGenerationJobs;
}

export async function getAIJob(id: string): Promise<AIGenerationJob | null> {
  const query = `query AIJob($id: ID!) { aiGenerationJob(id: $id) { ${JOB_FIELDS} } }`;
  const data = await graphqlRequest<{ aiGenerationJob: AIGenerationJob | null }>(query, { id });
  return data.aiGenerationJob;
}

export async function cancelAIJob(jobId: string): Promise<AIGenerationJob> {
  const mutation = `mutation CancelAIJob($jobId: ID!) { cancelAiGeneration(jobId: $jobId) { ${JOB_FIELDS} } }`;
  const data = await graphqlRequest<{ cancelAiGeneration: AIGenerationJob }>(mutation, { jobId });
  return data.cancelAiGeneration;
}

export async function startAIBuild(projectId: string, revisionId?: string): Promise<AIGenerationJob> {
  const mutation = `mutation StartAIBuild($projectId: ID!, $revisionId: ID) { startAiBuild(projectId: $projectId, revisionId: $revisionId) { ${JOB_FIELDS} } }`;
  const data = await graphqlRequest<{ startAiBuild: AIGenerationJob }>(mutation, { projectId, revisionId: revisionId || null });
  return data.startAiBuild;
}

export async function startAIRepair(projectId: string, buildId: string, prompt?: string): Promise<AIGenerationJob> {
  const mutation = `mutation StartAIRepair($projectId: ID!, $buildId: ID!, $prompt: String) { startAiRepair(projectId: $projectId, buildId: $buildId, prompt: $prompt) { ${JOB_FIELDS} } }`;
  const data = await graphqlRequest<{ startAiRepair: AIGenerationJob }>(mutation, { projectId, buildId, prompt: prompt || null });
  return data.startAiRepair;
}

export async function startAIExport(projectId: string, format: string, revisionId?: string): Promise<AIGenerationJob> {
  const mutation = `mutation StartAIExport($projectId: ID!, $revisionId: ID, $format: String!) { startAiExport(projectId: $projectId, revisionId: $revisionId, format: $format) { ${JOB_FIELDS} } }`;
  const data = await graphqlRequest<{ startAiExport: AIGenerationJob }>(mutation, { projectId, revisionId: revisionId || null, format });
  return data.startAiExport;
}

export async function listAIBuilds(projectId: string): Promise<AIProjectBuild[]> {
  const query = `query AIBuilds($projectId: ID!) { aiBuilds(projectId: $projectId) { ${BUILD_FIELDS} } }`;
  const data = await graphqlRequest<{ aiBuilds: AIProjectBuild[] }>(query, { projectId });
  return data.aiBuilds;
}

export async function listAIDeployments(projectId: string): Promise<AIProjectDeployment[]> {
  const query = `query AIDeployments($projectId: ID!) { aiDeployments(projectId: $projectId) { id projectId revisionId buildId jobId provider status externalId url metadata logs createdAt updatedAt } }`;
  const data = await graphqlRequest<{ aiDeployments: AIProjectDeployment[] }>(query, { projectId });
  return data.aiDeployments;
}

export async function startAIDeployment(projectId: string, buildId: string, provider = 'venturemate'): Promise<AIGenerationJob> {
  const mutation = `mutation StartAIDeployment($projectId: ID!, $buildId: ID!, $provider: String) { startAiDeployment(projectId: $projectId, buildId: $buildId, provider: $provider) { ${JOB_FIELDS} } }`;
  const data = await graphqlRequest<{ startAiDeployment: AIGenerationJob }>(mutation, { projectId, buildId, provider });
  return data.startAiDeployment;
}

export async function listAIAssets(projectId?: string, businessId?: string): Promise<AIAsset[]> {
  const query = `query AIAssets($projectId: ID, $businessId: ID) { aiAssets(projectId: $projectId, businessId: $businessId) { id businessId projectId source kind prompt model style mimeType width height sizeBytes storageKey url thumbnailUrl metadata createdAt updatedAt } }`;
  const data = await graphqlRequest<{ aiAssets: AIAsset[] }>(query, { projectId: projectId || null, businessId: businessId || null });
  return data.aiAssets;
}

export async function generateAIAsset(input: { projectId?: string; businessId?: string; kind: string; subject: string; purpose?: string; style?: string; size?: string; vector?: boolean; pro?: boolean }): Promise<AIGenerationJob> {
  const mutation = `mutation GenerateAIAsset($projectId: ID, $businessId: ID, $kind: String!, $subject: String!, $purpose: String, $style: String, $size: String, $vector: Boolean, $pro: Boolean) { generateAiAsset(projectId: $projectId, businessId: $businessId, kind: $kind, subject: $subject, purpose: $purpose, style: $style, size: $size, vector: $vector, pro: $pro) { ${JOB_FIELDS} } }`;
  const data = await graphqlRequest<{ generateAiAsset: AIGenerationJob }>(mutation, input);
  return data.generateAiAsset;
}

export async function setAIProjectPublished(projectId: string, published: boolean): Promise<AIProject> {
  const field = published ? 'publishAiProject' : 'unpublishAiProject';
  const mutation = `mutation ProjectPublish($projectId: ID!) { ${field}(projectId: $projectId) { ${PROJECT_FIELDS} } }`;
  const data = await graphqlRequest<Record<string, AIProject>>(mutation, { projectId });
  return data[field];
}

export function apiOrigin(): string {
  const value = API_CONFIG.GRAPHQL_URL;
  if (/^https?:\/\//i.test(value)) return new URL(value).origin;
  return window.location.origin;
}

export function sourceDownloadUrl(projectId: string): string {
  return `${apiOrigin()}/api/ai/projects/${encodeURIComponent(projectId)}/source.zip`;
}

export function buildDownloadUrl(buildId: string): string {
  return `${apiOrigin()}/api/ai/builds/${encodeURIComponent(buildId)}/download`;
}

export async function authenticatedDownload(url: string, filename: string): Promise<void> {
  const token = getToken();
  const response = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  if (!response.ok) throw new Error(`Download failed (${response.status})`);
  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);
}
