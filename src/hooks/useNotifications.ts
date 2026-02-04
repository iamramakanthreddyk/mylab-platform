import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { toast } from 'sonner';

export interface NotificationItem {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info' | 'payment';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  actionUrl?: string;
  actionLabel?: string;
  persistent?: boolean;
}

export const useNotifications = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  // Load notifications from API
  const loadNotifications = useCallback(async () => {
    try {
      const response = await fetch('/api/notifications');
      if (!response.ok) throw new Error('Failed to load notifications');
      
      const data = await response.json();
      const apiNotifications: NotificationItem[] = data.notifications.map((n: any) => ({
        id: n.id.toString(),
        type: n.type === 'payment_reminder' ? 'payment' : (n.type as any) || 'info',
        title: n.title,
        message: n.message,
        timestamp: new Date(n.created_at),
        read: n.read || false,
        actionUrl: n.action_url,
        actionLabel: n.type === 'payment_reminder' ? 'View Details' : undefined,
        persistent: n.priority === 'high'
      }));
      
      setNotifications(apiNotifications);
    } catch (error) {
      console.error('Error loading notifications:', error);
      // Fallback to empty array if API fails
      setNotifications([]);
    }
  }, []);

  // Save notifications - not needed with API, but keep for compatibility
  const saveNotifications = useCallback((newNotifications: NotificationItem[]) => {
    // No longer saves to localStorage, API handles persistence
  }, []);

  // Add a new notification
  const addNotification = useCallback((notification: Omit<NotificationItem, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: NotificationItem = {
      ...notification,
      id: Date.now().toString(),
      timestamp: new Date(),
      read: false
    };

    setNotifications(prev => {
      const updated = [newNotification, ...prev];
      saveNotifications(updated);
      return updated;
    });

    // Show toast notification
    showToast(newNotification);

    return newNotification.id;
  }, [saveNotifications]);

  // Mark notification as read
  const markAsRead = useCallback(async (id: string) => {
    if (!user) return;
    
    try {
      const response = await fetch(`/api/notifications/${id}/read`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id })
      });
      
      if (!response.ok) throw new Error('Failed to mark as read');
      
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }, [user]);

  // Remove notification
  const removeNotification = useCallback(async (id: string) => {
    if (!user) return;
    
    try {
      const response = await fetch(`/api/notifications/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id })
      });
      
      if (!response.ok) throw new Error('Failed to delete notification');
      
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (error) {
      console.error('Error removing notification:', error);
    }
  }, [user]);

  // Clear all notifications
  const clearAllNotifications = useCallback(async () => {
    if (!user) return;
    
    try {
      const response = await fetch('/api/notifications/clear-all', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id })
      });
      
      if (!response.ok) throw new Error('Failed to clear notifications');
      
      setNotifications([]);
    } catch (error) {
      console.error('Error clearing notifications:', error);
    }
  }, [user]);

  // Show toast notification
  const showToast = useCallback((notification: NotificationItem) => {
    const toastOptions = {
      description: notification.message,
      action: notification.actionLabel && notification.actionUrl ? {
        label: notification.actionLabel,
        onClick: () => window.location.href = notification.actionUrl!
      } : undefined,
      duration: notification.persistent ? Infinity : 5000
    };

    switch (notification.type) {
      case 'success':
        toast.success(notification.title, toastOptions);
        break;
      case 'error':
        toast.error(notification.title, toastOptions);
        break;
      case 'warning':
        toast.warning(notification.title, toastOptions);
        break;
      case 'payment':
        toast.warning(notification.title, {
          ...toastOptions,
          description: `${notification.message} Click to view billing details.`,
          action: {
            label: 'View Billing',
            onClick: () => window.location.href = '/settings/billing'
          }
        });
        break;
      default:
        toast.info(notification.title, toastOptions);
    }
  }, []);

  // Payment-specific notification helpers
  const showPaymentReminder = useCallback((workspaceName: string, amount: number, daysUntilDue: number) => {
    const message = daysUntilDue > 0
      ? `Payment of $${amount} due in ${daysUntilDue} days`
      : `Payment of $${amount} is ${Math.abs(daysUntilDue)} days overdue`;

    return addNotification({
      type: 'payment',
      title: `Payment Reminder - ${workspaceName}`,
      message,
      actionUrl: '/settings/billing',
      actionLabel: 'Pay Now',
      persistent: daysUntilDue <= 0
    });
  }, [addNotification]);

  const showPaymentOverdue = useCallback((workspaceName: string, amount: number, daysOverdue: number) => {
    return addNotification({
      type: 'payment',
      title: `Payment Overdue - ${workspaceName}`,
      message: `$${amount} payment is ${daysOverdue} days overdue. Access may be limited.`,
      actionUrl: '/settings/billing',
      actionLabel: 'Pay Now',
      persistent: true
    });
  }, [addNotification]);

  const showPaymentCompleted = useCallback((workspaceName: string) => {
    return addNotification({
      type: 'success',
      title: 'Payment Completed',
      message: `Payment for ${workspaceName} has been processed successfully.`,
      persistent: false
    });
  }, [addNotification]);

  // Template-based notification helpers
  const sendPaymentReminder = useCallback(async (workspaceName: string, amount: number, daysUntilDue: number) => {
    try {
      const response = await fetch('/api/notifications/payment-reminder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceName,
          amount,
          daysUntilDue,
          message: NotificationTemplates.paymentReminder(workspaceName, amount, daysUntilDue).message
        })
      });

      if (!response.ok) throw new Error('Failed to send payment reminder');

      toast.success('Payment reminder sent successfully');
      loadNotifications(); // Refresh notifications
    } catch (error) {
      console.error('Error sending payment reminder:', error);
      toast.error('Failed to send payment reminder');
    }
  }, [loadNotifications]);

  const sendSystemAnnouncement = useCallback(async (
    title: string,
    message: string,
    targetAudience: 'all' | 'admins' | 'workspace' = 'all',
    workspaceId?: string
  ) => {
    try {
      const response = await fetch('/api/notifications/system-announcement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          message,
          type: 'system',
          priority: 'medium',
          targetAudience,
          workspaceId,
          sendEmail: false,
          expiresInDays: 7
        })
      });

      if (!response.ok) throw new Error('Failed to send system announcement');

      const result = await response.json();
      toast.success(`Announcement sent to ${result.recipientCount} users`);
      loadNotifications(); // Refresh notifications
    } catch (error) {
      console.error('Error sending system announcement:', error);
      toast.error('Failed to send system announcement');
    }
  }, [loadNotifications]);

  const sendProjectUpdate = useCallback(async (
    projectId: string,
    notificationType: string,
    title: string,
    message: string
  ) => {
    try {
      const response = await fetch('/api/notifications/project-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          notificationType,
          title,
          message,
          priority: 'medium',
          notifyStakeholders: true
        })
      });

      if (!response.ok) throw new Error('Failed to send project update');

      const result = await response.json();
      toast.success(`Project update sent to ${result.recipientCount} stakeholders`);
      loadNotifications(); // Refresh notifications
    } catch (error) {
      console.error('Error sending project update:', error);
      toast.error('Failed to send project update');
    }
  }, [loadNotifications]);

  // Initialize on mount
  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  return {
    notifications,
    addNotification,
    markAsRead,
    removeNotification,
    clearAllNotifications,
    showPaymentReminder,
    showPaymentOverdue,
    showPaymentCompleted,
    sendPaymentReminder,
    sendSystemAnnouncement,
    sendProjectUpdate,
    unreadCount: notifications.filter(n => !n.read).length
  };
};

export default useNotifications;