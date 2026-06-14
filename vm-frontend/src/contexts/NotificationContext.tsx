import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { graphqlRequest } from '../lib/api';
import { useAuth } from './AuthContext';
import type { AppNotification } from '../types/venturemate';

const NOTIFICATIONS_QUERY = `
  query Notifications($userId: ID!, $unreadOnly: Boolean) {
    notifications(userId: $userId, unreadOnly: $unreadOnly) {
      id, userId, type, title, description, read, actionUrl, actionLabel, createdAt
    }
  }
`;

const UNREAD_COUNT_QUERY = `
  query UnreadCount($userId: ID!) {
    unreadNotificationCount(userId: $userId)
  }
`;

const MARK_READ_MUTATION = `
  mutation MarkRead($id: ID!, $userId: ID!) {
    markNotificationRead(id: $id, userId: $userId)
  }
`;

const MARK_ALL_READ_MUTATION = `
  mutation MarkAllRead($userId: ID!) {
    markAllNotificationsRead(userId: $userId)
  }
`;

const DELETE_MUTATION = `
  mutation DeleteNotification($id: ID!, $userId: ID!) {
    deleteNotification(id: $id, userId: $userId)
  }
`;

const DELETE_ALL_READ_MUTATION = `
  mutation DeleteAllRead($userId: ID!) {
    deleteAllReadNotifications(userId: $userId)
  }
`;

interface NotificationContextValue {
  notifications: AppNotification[];
  unreadCount: number;
  loading: boolean;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  deleteAllRead: () => Promise<void>;
  refresh: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const userId = user?.id;

  const fetchNotifications = useCallback(async () => {
    if (!userId) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }
    try {
      const [notifData, countData] = await Promise.all([
        graphqlRequest<{ notifications: AppNotification[] }>(NOTIFICATIONS_QUERY, { userId, unreadOnly: false }),
        graphqlRequest<{ unreadNotificationCount: number }>(UNREAD_COUNT_QUERY, { userId }),
      ]);
      setNotifications(notifData.notifications || []);
      setUnreadCount(countData.unreadNotificationCount || 0);
    } catch {
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const markAsRead = useCallback(async (id: string) => {
    if (!userId) return;
    await graphqlRequest(MARK_READ_MUTATION, { id, userId });
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, [userId]);

  const markAllAsRead = useCallback(async () => {
    if (!userId) return;
    await graphqlRequest(MARK_ALL_READ_MUTATION, { userId });
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  }, [userId]);

  const deleteNotification = useCallback(async (id: string) => {
    if (!userId) return;
    await graphqlRequest(DELETE_MUTATION, { id, userId });
    setNotifications(prev => {
      const removed = prev.find(n => n.id === id);
      if (removed && !removed.read) setUnreadCount(c => Math.max(0, c - 1));
      return prev.filter(n => n.id !== id);
    });
  }, [userId]);

  const deleteAllRead = useCallback(async () => {
    if (!userId) return;
    await graphqlRequest(DELETE_ALL_READ_MUTATION, { userId });
    setNotifications(prev => prev.filter(n => !n.read));
  }, [userId]);

  return (
    <NotificationContext.Provider value={{
      notifications, unreadCount, loading,
      markAsRead, markAllAsRead,
      deleteNotification, deleteAllRead,
      refresh: fetchNotifications,
    }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
}
