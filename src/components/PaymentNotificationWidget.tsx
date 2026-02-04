import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { AlertTriangle, Clock, CheckCircle, Bell } from 'lucide-react';
import { toast } from 'sonner';

interface PaymentNotification {
  id: string;
  workspaceName: string;
  paymentStatus: 'pending' | 'overdue' | 'completed';
  amount: number;
  dueDate: Date;
  daysOverdue?: number;
}

export const PaymentNotificationWidget: React.FC = () => {
  const [notifications, setNotifications] = useState<PaymentNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPaymentNotifications();
  }, []);

  const loadPaymentNotifications = async () => {
    try {
      const response = await fetch('/api/company/workspaces/payment-status');
      if (!response.ok) throw new Error('Failed to fetch payment notifications');
      
      const data = await response.json();
      setNotifications(data.workspaces || []);
    } catch (error) {
      console.error('Error loading payment notifications:', error);
      toast.error('Failed to load payment notifications');
    } finally {
      setLoading(false);
    }
  };

  const sendReminder = async (workspaceId: string) => {
    try {
      const response = await fetch('/api/company/payments/send-reminder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          workspaceId,
          message: `Payment reminder sent for workspace ${workspaceId}`
        })
      });
      
      if (!response.ok) throw new Error('Failed to send reminder');
      
      toast.success('Payment reminder sent successfully');
      // Reload notifications to show updated status
      loadPaymentNotifications();
    } catch (error) {
      console.error('Error sending reminder:', error);
      toast.error('Failed to send reminder');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'overdue':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-orange-500" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return <Bell className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'overdue':
        return <Badge variant="destructive">Overdue</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      case 'completed':
        return <Badge variant="default">Completed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Bell className="h-5 w-5" />
            <span>Payment Notifications</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
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
            <span>Payment Notifications</span>
          </div>
          {notifications.length > 0 && (
            <Badge variant="secondary">{notifications.length}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {notifications.length === 0 ? (
          <div className="text-center py-6">
            <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">All payments up to date</p>
          </div>
        ) : (
          <div className="space-y-4">
            {notifications.map((notification) => (
              <div key={notification.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-3">
                  {getStatusIcon(notification.paymentStatus)}
                  <div>
                    <p className="font-medium text-sm">{notification.workspaceName}</p>
                    <p className="text-xs text-muted-foreground">
                      ${notification.amount}/month
                      {notification.daysOverdue && ` • ${notification.daysOverdue} days overdue`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {getStatusBadge(notification.paymentStatus)}
                  {notification.paymentStatus !== 'completed' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => sendReminder(notification.id)}
                    >
                      Remind
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PaymentNotificationWidget;