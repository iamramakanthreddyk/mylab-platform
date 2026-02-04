import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Bell, Info, AlertTriangle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

interface SystemNotification {
  id: string;
  type: 'info' | 'warning' | 'success' | 'error';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  priority: 'low' | 'medium' | 'high';
}

export const SystemNotificationWidget: React.FC = () => {
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSystemNotifications();
  }, []);

  const loadSystemNotifications = async () => {
    try {
      // TODO: Replace with actual API call
      // const response = await fetch('/api/notifications/system');
      // const data = await response.json();

      // Mock data for now
      const mockData: SystemNotification[] = [
        {
          id: '1',
          type: 'warning',
          title: 'Storage Limit',
          message: '85% of storage used',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
          read: false,
          priority: 'medium'
        },
        {
          id: '2',
          type: 'info',
          title: 'New Feature Available',
          message: 'Advanced analytics now available',
          timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
          read: true,
          priority: 'low'
        }
      ];

      setNotifications(mockData);
    } catch (error) {
      console.error('Error loading system notifications:', error);
      toast.error('Failed to load system notifications');
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    setNotifications(prev =>
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    );
    // TODO: Call API to mark as read
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default:
        return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Bell className="h-5 w-5" />
            <span>System Notifications</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            <div className="h-3 bg-gray-200 rounded w-full"></div>
            <div className="h-3 bg-gray-200 rounded w-3/4"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Bell className="h-5 w-5" />
            <span>System Notifications</span>
          </div>
          {unreadCount > 0 && (
            <Badge variant="secondary" className="text-xs">{unreadCount}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {notifications.length === 0 ? (
          <div className="text-center py-4">
            <CheckCircle className="h-6 w-6 text-green-500 mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">All caught up!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.slice(0, 3).map((notification) => (
              <div key={notification.id} className="flex items-start space-x-2">
                {getNotificationIcon(notification.type)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{notification.title}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {notification.message}
                  </p>
                  {!notification.read && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 px-2 text-xs mt-1"
                      onClick={() => markAsRead(notification.id)}
                    >
                      Mark read
                    </Button>
                  )}
                </div>
              </div>
            ))}
            {notifications.length > 3 && (
              <Button variant="outline" size="sm" className="w-full">
                View all notifications
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SystemNotificationWidget;