import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Switch } from './ui/switch';
import { Megaphone, Send } from 'lucide-react';
import { toast } from 'sonner';

interface SystemNotificationForm {
  title: string;
  message: string;
  type: 'system' | 'warning' | 'info' | 'success';
  priority: 'low' | 'medium' | 'high';
  targetAudience: 'all' | 'admins' | 'workspace';
  workspaceId?: string;
  sendEmail: boolean;
  expiresInDays: number;
}

export const SystemNotificationWorkflow: React.FC = () => {
  const [form, setForm] = useState<SystemNotificationForm>({
    title: '',
    message: '',
    type: 'system',
    priority: 'medium',
    targetAudience: 'all',
    sendEmail: false,
    expiresInDays: 7
  });

  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.title.trim() || !form.message.trim()) {
      toast.error('Title and message are required');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/notifications/system-announcement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          expiresAt: form.expiresInDays > 0
            ? new Date(Date.now() + form.expiresInDays * 24 * 60 * 60 * 1000).toISOString()
            : null
        })
      });

      if (!response.ok) throw new Error('Failed to send notification');

      const result = await response.json();
      toast.success(`System notification sent to ${result.recipientCount} users`);

      // Reset form
      setForm({
        title: '',
        message: '',
        type: 'system',
        priority: 'medium',
        targetAudience: 'all',
        sendEmail: false,
        expiresInDays: 7
      });

    } catch (error) {
      console.error('Error sending system notification:', error);
      toast.error('Failed to send system notification');
    } finally {
      setLoading(false);
    }
  };

  const updateForm = (field: keyof SystemNotificationForm, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Megaphone className="h-5 w-5" />
          <span>System Notification</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Notification Title</Label>
            <Input
              id="title"
              value={form.title}
              onChange={(e) => updateForm('title', e.target.value)}
              placeholder="e.g., System Maintenance Scheduled"
              required
            />
          </div>

          {/* Message */}
          <div className="space-y-2">
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              value={form.message}
              onChange={(e) => updateForm('message', e.target.value)}
              placeholder="Detailed notification message..."
              rows={4}
              required
            />
          </div>

          {/* Type and Priority */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={form.type} onValueChange={(value: any) => updateForm('type', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="system">System</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={form.priority} onValueChange={(value: any) => updateForm('priority', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Target Audience */}
          <div className="space-y-2">
            <Label>Target Audience</Label>
            <Select value={form.targetAudience} onValueChange={(value: any) => updateForm('targetAudience', value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                <SelectItem value="admins">Workspace Admins Only</SelectItem>
                <SelectItem value="workspace">Specific Workspace</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Workspace ID (conditional) */}
          {form.targetAudience === 'workspace' && (
            <div className="space-y-2">
              <Label htmlFor="workspaceId">Workspace ID</Label>
              <Input
                id="workspaceId"
                value={form.workspaceId || ''}
                onChange={(e) => updateForm('workspaceId', e.target.value)}
                placeholder="Enter workspace ID"
                required
              />
            </div>
          )}

          {/* Additional Options */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="sendEmail">Send Email Notification</Label>
              <Switch
                id="sendEmail"
                checked={form.sendEmail}
                onCheckedChange={(checked) => updateForm('sendEmail', checked)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="expiresInDays">Expires In (Days)</Label>
              <Input
                id="expiresInDays"
                type="number"
                min="0"
                max="365"
                value={form.expiresInDays}
                onChange={(e) => updateForm('expiresInDays', parseInt(e.target.value) || 0)}
              />
              <p className="text-xs text-muted-foreground">
                Set to 0 for notifications that don't expire
              </p>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end">
            <Button type="submit" disabled={loading} className="flex items-center space-x-2">
              <Send className="h-4 w-4" />
              <span>{loading ? 'Sending...' : 'Send Notification'}</span>
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};