import React, { useState, useEffect } from 'react';
import { Bell, Settings, X } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { toast } from 'sonner';

interface NotificationPreferences {
  email: boolean;
  push: boolean;
  paymentReminders: boolean;
  systemUpdates: boolean;
  projectUpdates: boolean;
  sampleUpdates: boolean;
}

export const NotificationSettings: React.FC = () => {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    email: true,
    push: true,
    paymentReminders: true,
    systemUpdates: true,
    projectUpdates: false,
    sampleUpdates: false
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    if (!user) return;
    
    try {
      const response = await fetch(`/api/notifications/preferences?userId=${user.id}`);
      if (response.ok) {
        const data = await response.json();
        setPreferences(data.preferences);
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    }
  };

  const savePreferences = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/notifications/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, preferences })
      });

      if (!response.ok) {
        throw new Error('Failed to save preferences');
      }

      toast.success('Notification preferences saved');
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast.error('Failed to save preferences');
    } finally {
      setLoading(false);
    }
  };

  const updatePreference = (key: keyof NotificationPreferences, value: boolean) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Settings className="h-5 w-5" />
          <span>Notification Preferences</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Global Settings */}
        <div className="space-y-4">
          <h4 className="font-medium">Global Settings</h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="email-notifications">Email Notifications</Label>
              <Switch
                id="email-notifications"
                checked={preferences.email}
                onCheckedChange={(checked) => updatePreference('email', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="push-notifications">Push Notifications</Label>
              <Switch
                id="push-notifications"
                checked={preferences.push}
                onCheckedChange={(checked) => updatePreference('push', checked)}
              />
            </div>
          </div>
        </div>

        {/* Category Settings */}
        <div className="space-y-4">
          <h4 className="font-medium">Notification Types</h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="payment-reminders">Payment Reminders</Label>
                <p className="text-sm text-muted-foreground">Get notified about payment due dates and status</p>
              </div>
              <Switch
                id="payment-reminders"
                checked={preferences.paymentReminders}
                onCheckedChange={(checked) => updatePreference('paymentReminders', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="system-updates">System Updates</Label>
                <p className="text-sm text-muted-foreground">Maintenance, feature updates, and announcements</p>
              </div>
              <Switch
                id="system-updates"
                checked={preferences.systemUpdates}
                onCheckedChange={(checked) => updatePreference('systemUpdates', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="project-updates">Project Updates</Label>
                <p className="text-sm text-muted-foreground">Milestones, status changes, and deadlines</p>
              </div>
              <Switch
                id="project-updates"
                checked={preferences.projectUpdates}
                onCheckedChange={(checked) => updatePreference('projectUpdates', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="sample-updates">Sample Updates</Label>
                <p className="text-sm text-muted-foreground">Sample status changes and processing updates</p>
              </div>
              <Switch
                id="sample-updates"
                checked={preferences.sampleUpdates}
                onCheckedChange={(checked) => updatePreference('sampleUpdates', checked)}
              />
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button onClick={savePreferences} disabled={loading}>
            {loading ? 'Saving...' : 'Save Preferences'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};