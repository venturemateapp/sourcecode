type StudioMessage = {
  source: 'venturemate-preview';
  type: 'hover' | 'select' | 'runtime-error';
  payload: Record<string, unknown>;
};

const nodeSelector = '[data-vm-node-id]';

function configuredStudioOrigin(): string | null {
  const value = new URLSearchParams(window.location.search).get('studioOrigin');
  if (!value) return null;
  try {
    const parsed = new URL(value);
    return parsed.origin === value ? parsed.origin : null;
  } catch {
    return null;
  }
}

export function installStudioBridge(): () => void {
  const studioOrigin = configuredStudioOrigin();
  if (!studioOrigin || window.parent === window) return () => undefined;

  let outlined: HTMLElement | null = null;
  const send = (type: StudioMessage['type'], payload: StudioMessage['payload']) => {
    const message: StudioMessage = { source: 'venturemate-preview', type, payload };
    window.parent.postMessage(message, studioOrigin);
  };
  const describe = (element: HTMLElement) => ({
    nodeId: element.dataset.vmNodeId || '',
    tagName: element.tagName.toLowerCase(),
    text: (element.innerText || element.textContent || '').trim().slice(0, 500),
  });
  const restoreOutline = () => {
    if (!outlined) return;
    outlined.style.removeProperty('outline');
    outlined.style.removeProperty('outline-offset');
    outlined = null;
  };
  const outline = (element: HTMLElement) => {
    if (outlined === element) return;
    restoreOutline();
    outlined = element;
    element.style.setProperty('outline', '2px solid #8b5cf6', 'important');
    element.style.setProperty('outline-offset', '2px', 'important');
  };
  const findNode = (target: EventTarget | null) => target instanceof Element ? target.closest<HTMLElement>(nodeSelector) : null;
  const onMove = (event: MouseEvent) => {
    const element = findNode(event.target);
    if (!element) return restoreOutline();
    outline(element);
    send('hover', describe(element));
  };
  const onClick = (event: MouseEvent) => {
    const element = findNode(event.target);
    if (!element) return;
    event.preventDefault();
    event.stopPropagation();
    outline(element);
    send('select', describe(element));
  };
  const onMessage = (event: MessageEvent) => {
    if (event.origin !== studioOrigin || event.source !== window.parent || !event.data || typeof event.data !== 'object') return;
    const data = event.data as { source?: unknown; type?: unknown; nodeId?: unknown };
    if (data.source !== 'venturemate-studio' || data.type !== 'highlight' || typeof data.nodeId !== 'string') return;
    const escaped = typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(data.nodeId) : data.nodeId.replace(/["\\]/g, '\\$&');
    const element = document.querySelector<HTMLElement>(`[data-vm-node-id="${escaped}"]`);
    if (element) {
      outline(element);
      element.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  };
  const onError = (event: ErrorEvent) => send('runtime-error', { message: event.message, filename: event.filename, line: event.lineno, column: event.colno });
  const onRejection = (event: PromiseRejectionEvent) => send('runtime-error', { message: event.reason instanceof Error ? event.reason.message : String(event.reason) });

  document.addEventListener('mousemove', onMove, true);
  document.addEventListener('click', onClick, true);
  window.addEventListener('message', onMessage);
  window.addEventListener('error', onError);
  window.addEventListener('unhandledrejection', onRejection);
  return () => {
    restoreOutline();
    document.removeEventListener('mousemove', onMove, true);
    document.removeEventListener('click', onClick, true);
    window.removeEventListener('message', onMessage);
    window.removeEventListener('error', onError);
    window.removeEventListener('unhandledrejection', onRejection);
  };
}
