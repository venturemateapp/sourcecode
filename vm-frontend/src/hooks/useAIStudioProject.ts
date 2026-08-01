import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  approveAIRevision, createAIProject, createAIRevision, generateAIAsset, listAIAssets, listAIBuilds,
  listAIJobs, listAIProjectFiles, listAIProjects, listAIRevisions, rollbackAIProject,
  startAIBuild, startAIGeneration, updateAIProjectFile,
} from '../lib/ai-studio/api';
import type {
  AIAsset, AIProject, AIProjectBuild, AIProjectFile, AIProjectRevision, AIProjectType,
} from '../lib/ai-studio/types';
import { useAIJob } from './useAIJob';

function parseResult(result: string): { revisionId?: string } {
  try { return JSON.parse(result || '{}') as { revisionId?: string }; } catch { return {}; }
}

export function useAIStudioProject(projectType: AIProjectType, businessId?: string, defaultName = 'Untitled project') {
  const storageKey = `venturemate:ai-studio:${projectType}:${businessId || 'personal'}`;
  const [projects, setProjects] = useState<AIProject[]>([]);
  const [project, setProject] = useState<AIProject | null>(null);
  const [revisions, setRevisions] = useState<AIProjectRevision[]>([]);
  const [files, setFiles] = useState<AIProjectFile[]>([]);
  const [builds, setBuilds] = useState<AIProjectBuild[]>([]);
  const [assets, setAssets] = useState<AIAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshProjectData = useCallback(async (target: AIProject) => {
    const [nextRevisions, nextAssets] = await Promise.all([
      listAIRevisions(target.id), listAIAssets(target.id, businessId),
    ]);
    setRevisions(nextRevisions);
    setAssets(nextAssets);
    if (projectType === 'web_app') {
      const [nextFiles, nextBuilds] = await Promise.all([listAIProjectFiles(target.id), listAIBuilds(target.id)]);
      setFiles(nextFiles);
      setBuilds(nextBuilds);
    }
  }, [businessId, projectType]);

  const { job, watch, clear: clearJob, connected } = useAIJob(async (settledJob) => {
    if (settledJob.status === 'awaiting_review' || settledJob.status === 'completed') {
      if (project) await refreshProjectData(project);
    }
  });

  const reconnectJob = useCallback(async (target: AIProject) => {
    const jobs = await listAIJobs(target.id);
    const reconnectable = jobs.find(item => ['queued', 'running', 'awaiting_review'].includes(item.status));
    if (reconnectable) watch(reconnectable);
  }, [watch]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const nextProjects = await listAIProjects(businessId, projectType);
      setProjects(nextProjects);
      const stored = localStorage.getItem(storageKey);
      const selected = nextProjects.find(item => item.id === stored) || nextProjects[0] || null;
      setProject(selected);
      if (selected) {
        localStorage.setItem(storageKey, selected.id);
        await Promise.all([refreshProjectData(selected), reconnectJob(selected)]);
      } else {
        setRevisions([]); setFiles([]); setBuilds([]); setAssets([]);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load AI Studio projects.');
    } finally {
      setLoading(false);
    }
  }, [businessId, projectType, reconnectJob, refreshProjectData, storageKey]);

  useEffect(() => { void load(); }, [load]);

  const selectProject = useCallback(async (target: AIProject) => {
    setProject(target);
    localStorage.setItem(storageKey, target.id);
    clearJob();
    setLoading(true);
    try { await Promise.all([refreshProjectData(target), reconnectJob(target)]); } finally { setLoading(false); }
  }, [clearJob, reconnectJob, refreshProjectData, storageKey]);

  const createProject = useCallback(async (name = defaultName) => {
    setSaving(true);
    setError(null);
    try {
      const created = await createAIProject(name.trim() || defaultName, projectType, businessId);
      setProjects(current => [created, ...current]);
      await selectProject(created);
      return created;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not create project.');
      throw cause;
    } finally { setSaving(false); }
  }, [businessId, defaultName, projectType, selectProject]);

  const generate = useCallback(async (prompt: string, projection?: Record<string, unknown>) => {
    if (!project) throw new Error('Create or select a project first.');
    setError(null);
    const next = await startAIGeneration(project.id, prompt, projection);
    watch(next);
    return next;
  }, [project, watch]);

  const pendingRevision = useMemo(() => {
    const revisionId = job ? parseResult(job.result).revisionId : undefined;
    return (revisionId && revisions.find(item => item.id === revisionId))
      || revisions.find(item => item.status === 'ready' && item.id !== project?.approvedRevisionId)
      || null;
  }, [job, project?.approvedRevisionId, revisions]);

  const approvedRevision = useMemo(() => {
    if (!project?.approvedRevisionId) return revisions.find(item => item.status === 'approved') || null;
    return revisions.find(item => item.id === project.approvedRevisionId) || null;
  }, [project?.approvedRevisionId, revisions]);

  const approve = useCallback(async (revisionId: string) => {
    setSaving(true);
    setError(null);
    try {
      const updated = await approveAIRevision(revisionId);
      setProject(updated);
      setProjects(current => current.map(item => item.id === updated.id ? updated : item));
      await refreshProjectData(updated);
      return updated;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not approve revision.');
      throw cause;
    } finally { setSaving(false); }
  }, [refreshProjectData]);

  const saveDocument = useCallback(async (document: string, summary: string) => {
    if (!project) throw new Error('No project selected.');
    setSaving(true);
    setError(null);
    try {
      let schemaVersion: string | undefined;
      try {
        const parsed = JSON.parse(document) as { schemaVersion?: unknown };
        if (typeof parsed.schemaVersion === 'string') schemaVersion = parsed.schemaVersion;
      } catch {
        // The API will return a validation error for malformed JSON.
      }
      const revision = await createAIRevision({ projectId: project.id, document, summary, schemaVersion });
      setRevisions(current => [revision, ...current.filter(item => item.id !== revision.id)]);
      return revision;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save revision.');
      throw cause;
    } finally { setSaving(false); }
  }, [project]);

  const saveFile = useCallback(async (file: AIProjectFile, content: string, summary: string) => {
    if (!project) throw new Error('No project selected.');
    setSaving(true);
    setError(null);
    try {
      const revision = await updateAIProjectFile(project.id, file, content, summary);
      setRevisions(current => [revision, ...current.filter(item => item.id !== revision.id)]);
      await refreshProjectData(project);
      return revision;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save file.');
      throw cause;
    } finally { setSaving(false); }
  }, [project, refreshProjectData]);

  const rollback = useCallback(async (revisionId: string) => {
    if (!project) throw new Error('No project selected.');
    setSaving(true);
    try {
      const revision = await rollbackAIProject(project.id, revisionId);
      await refreshProjectData(project);
      return revision;
    } finally { setSaving(false); }
  }, [project, refreshProjectData]);

  const build = useCallback(async () => {
    if (!project) throw new Error('No project selected.');
    const next = await startAIBuild(project.id, project.approvedRevisionId);
    watch(next);
    return next;
  }, [project, watch]);

  const generateAsset = useCallback(async (input: { kind: string; subject: string; purpose?: string; style?: string; size?: string; vector?: boolean; pro?: boolean }) => {
    if (!project) throw new Error('No project selected.');
    setError(null);
    try {
      const next = await generateAIAsset({ ...input, projectId: project.id, businessId });
      watch(next);
      return next;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not generate the Recraft asset.');
      throw cause;
    }
  }, [businessId, project, watch]);

  return {
    projects, project, revisions, files, builds, assets, job, connected,
    pendingRevision, approvedRevision, loading, saving, error, setError,
    load, refreshProjectData: () => project ? refreshProjectData(project) : Promise.resolve(), selectProject, createProject, generate, approve,
    saveDocument, saveFile, rollback, build, generateAsset, watch,
  };
}
