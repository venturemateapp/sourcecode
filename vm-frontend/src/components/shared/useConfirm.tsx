import { useState, useCallback } from 'react';
import { ConfirmDialog } from './ConfirmDialog';

interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  confirmColor?: string;
}

export function useConfirm() {
  const [state, setState] = useState<{ options: ConfirmOptions; onConfirm: () => void; loading?: boolean } | null>(null);

  const confirm = useCallback((options: ConfirmOptions, action: () => void) => {
    return new Promise<void>((resolve) => {
      setState({
        options,
        onConfirm: () => {
          action();
          resolve();
        },
      });
    });
  }, []);

  const confirmAction = useCallback((options: ConfirmOptions, action: () => Promise<void>) => {
    setState({
      options,
      onConfirm: async () => {
        setState(prev => prev ? { ...prev, loading: true } : null);
        try {
          await action();
        } finally {
          setState(null);
        }
      },
    });
  }, []);

  const dialog = state ? (
    <ConfirmDialog
      open={true}
      title={state.options.title}
      message={state.options.message}
      confirmLabel={state.options.confirmLabel}
      confirmColor={state.options.confirmColor}
      loading={state.loading}
      onConfirm={() => {
        state.onConfirm();
        if (!state.loading) setState(null);
      }}
      onCancel={() => setState(null)}
    />
  ) : null;

  return { confirm, confirmAction, dialog };
}
