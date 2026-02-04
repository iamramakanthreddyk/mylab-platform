import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Checkbox } from './ui/checkbox';
import { Badge } from './ui/badge';
import { Users, Send, Filter } from 'lucide-react';
import { toast } from 'sonner';

interface BulkNotificationForm {
  title: string;
  message: string;
  type: 'system' | 'warning' | 'info' | 'success';
  priority: 'low' | 'medium' | 'high';
  targetGroups: {
    allUsers: boolean;
    workspaceAdmins: boolean;
    specificWorkspaces: string[];
    userRoles: string[];
  };
  sendEmail: boolean;
  expiresInDays: number;
}

interface Workspace {
  id: string;
  name: string;
  userCount: number;
}

export const BulkNotificationWorkflow: React.FC = () => {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingWorkspaces, setLoadingWorkspaces] = useState(true);

  const [form, setForm] = useState<BulkNotificationForm>({
    title: '',
    message: '',
    type: 'info',
    priority: 'medium',
    targetGroups: {
      allUsers: false,
      workspaceAdmins: false,
      specificWorkspaces: [],
      userRoles: []
    },
    sendEmail: false,
    expiresInDays: 7
  });

  useEffect(() => {
    loadWorkspaces();
  }, []);

  const loadWorkspaces = async () => {
    try {
      // TODO: Replace with actual API call
      // const response = await fetch('/api/workspaces/summary');
      // const data = await response.json();

      // Mock data for now
      const mockWorkspaces: Workspace[] = [
        { id: '1', name: 'Research Lab A', userCount: 15 },
        { id: '2', name: 'Oncology Center', userCount: 8 },
        { id: '3', name: 'Endocrinology Lab', userCount: 12 },
        { id: '4', name: 'BioTech Inc', userCount: 25 }
      ];

      setWorkspaces(mockWorkspaces);
    } catch (error) {
      console.error('Error loading workspaces:', error);
      toast.error('Failed to load workspaces');
    } finally {
      setLoadingWorkspaces(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.title.trim() || !form.message.trim()) {
      toast.error('Title and message are required');
      return;
    }

    // Validate that at least one target group is selected
    const hasTargets = form.targetGroups.allUsers ||
                      form.targetGroups.workspaceAdmins ||
                      form.targetGroups.specificWorkspaces.length > 0 ||
                      form.targetGroups.userRoles.length > 0;

    if (!hasTargets) {
      toast.error('Please select at least one target group');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/notifications/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          expiresAt: form.expiresInDays > 0
            ? new Date(Date.now() + form.expiresInDays * 24 * 60 * 60 * 1000).toISOString()
            : null
        })
      });

      if (!response.ok) throw new Error('Failed to send bulk notification');

      const result = await response.json();
      toast.success(`Bulk notification sent to ${result.recipientCount} users`);

      // Reset form
      setForm({
        title: '',
        message: '',
        type: 'info',
        priority: 'medium',
        targetGroups: {
          allUsers: false,
          workspaceAdmins: false,
          specificWorkspaces: [],
          userRoles: []
        },
        sendEmail: false,
        expiresInDays: 7
      });

    } catch (error) {
      console.error('Error sending bulk notification:', error);
      toast.error('Failed to send bulk notification');
    } finally {
      setLoading(false);
    }
  };

  const updateForm = (field: keyof BulkNotificationForm, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const updateTargetGroups = (field: keyof BulkNotificationForm['targetGroups'], value: any) => {
    setForm(prev => ({
      ...prev,
      targetGroups: { ...prev.targetGroups, [field]: value }
    }));
  };

  const toggleWorkspace = (workspaceId: string) => {
    const current = form.targetGroups.specificWorkspaces;
    const updated = current.includes(workspaceId)
      ? current.filter(id => id !== workspaceId)
      : [...current, workspaceId];

    updateTargetGroups('specificWorkspaces', updated);
  };

  const toggleRole = (role: string) => {
    const current = form.targetGroups.userRoles;
    const updated = current.includes(role)
      ? current.filter(r => r !== role)
      : [...current, role];

    updateTargetGroups('userRoles', updated);
  };

  const calculateRecipientEstimate = () => {
    if (form.targetGroups.allUsers) return 'All users';
    if (form.targetGroups.workspaceAdmins) return 'All workspace admins';

    let count = 0;
    if (form.targetGroups.specificWorkspaces.length > 0) {
      count += form.targetGroups.specificWorkspaces.reduce((sum, wsId) => {
        const ws = workspaces.find(w => w.id === wsId);
        return sum + (ws?.userCount || 0);
      }, 0);
    }

    return count > 0 ? `~${count} users` : 'No targets selected';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Users className="h-5 w-5" />
          <span>Bulk Notifications</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Notification Title</Label>
              <Input
                id="title"
                value={form.title}
                onChange={(e) => updateForm('title', e.target.value)}
                placeholder="e.g., Important System Update"
                required
              />
            </div>

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

          {/* Priority and Expiration */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            </div>
          </div>

          {/* Target Groups */}
          <div className="space-y-4">
            <Label className="flex items-center space-x-2">
              <Filter className="h-4 w-4" />
              <span>Target Groups</span>
            </Label>

            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="allUsers"
                  checked={form.targetGroups.allUsers}
                  onCheckedChange={(checked) => updateTargetGroups('allUsers', checked)}
                />
                <Label htmlFor="allUsers">All Users</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="workspaceAdmins"
                  checked={form.targetGroups.workspaceAdmins}
                  onCheckedChange={(checked) => updateTargetGroups('workspaceAdmins', checked)}
                />
                <Label htmlFor="workspaceAdmins">Workspace Admins Only</Label>
              </div>
            </div>

            {/* Specific Workspaces */}
            <div className="space-y-2">
              <Label>Specific Workspaces</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                {workspaces.map((workspace) => (
                  <div key={workspace.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`ws-${workspace.id}`}
                      checked={form.targetGroups.specificWorkspaces.includes(workspace.id)}
                      onCheckedChange={() => toggleWorkspace(workspace.id)}
                    />
                    <Label htmlFor={`ws-${workspace.id}`} className="flex-1">
                      {workspace.name}
                      <Badge variant="secondary" className="ml-2 text-xs">
                        {workspace.userCount} users
                      </Badge>
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* User Roles */}
            <div className="space-y-2">
              <Label>User Roles</Label>
              <div className="flex flex-wrap gap-2">
                {['admin', 'manager', 'analyst', 'viewer'].map((role) => (
                  <div key={role} className="flex items-center space-x-2">
                    <Checkbox
                      id={`role-${role}`}
                      checked={form.targetGroups.userRoles.includes(role)}
                      onCheckedChange={() => toggleRole(role)}
                    />
                    <Label htmlFor={`role-${role}`} className="capitalize">
                      {role}s
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Email Option */}
          <div className="flex items-center justify-between">
            <Label htmlFor="sendEmail">Send Email Notification</Label>
            <Checkbox
              id="sendEmail"
              checked={form.sendEmail}
              onCheckedChange={(checked) => updateForm('sendEmail', checked)}
            />
          </div>

          {/* Recipient Estimate */}
          <div className="bg-muted p-3 rounded-lg">
            <p className="text-sm">
              <strong>Estimated Recipients:</strong> {calculateRecipientEstimate()}
            </p>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end">
            <Button type="submit" disabled={loading} className="flex items-center space-x-2">
              <Send className="h-4 w-4" />
              <span>{loading ? 'Sending...' : 'Send Bulk Notification'}</span>
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};