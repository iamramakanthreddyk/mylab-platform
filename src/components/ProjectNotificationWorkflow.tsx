import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Target, Send, Users } from 'lucide-react';
import { toast } from 'sonner';

interface Project {
  id: string;
  name: string;
  workspaceName: string;
  status: string;
  clientName?: string;
}

interface ProjectNotificationForm {
  projectId: string;
  notificationType: 'milestone' | 'status_change' | 'deadline' | 'completion';
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high';
  notifyStakeholders: boolean;
  customRecipients?: string[];
}

export const ProjectNotificationWorkflow: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingProjects, setLoadingProjects] = useState(true);

  const [form, setForm] = useState<ProjectNotificationForm>({
    projectId: '',
    notificationType: 'milestone',
    title: '',
    message: '',
    priority: 'medium',
    notifyStakeholders: true
  });

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const response = await fetch('/api/projects?limit=50');
      if (!response.ok) throw new Error('Failed to fetch projects');
      
      const data = await response.json();
      setProjects(data.data || data.projects || []);
    } catch (error) {
      console.error('Error loading projects:', error);
      toast.error('Failed to load projects');
    } finally {
      setLoadingProjects(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.projectId || !form.title.trim() || !form.message.trim()) {
      toast.error('Project, title, and message are required');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/notifications/project-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });

      if (!response.ok) throw new Error('Failed to send notification');

      const result = await response.json();
      toast.success(`Project notification sent to ${result.recipientCount} users`);

      // Reset form
      setForm({
        projectId: '',
        notificationType: 'milestone',
        title: '',
        message: '',
        priority: 'medium',
        notifyStakeholders: true
      });

    } catch (error) {
      console.error('Error sending project notification:', error);
      toast.error('Failed to send project notification');
    } finally {
      setLoading(false);
    }
  };

  const updateForm = (field: keyof ProjectNotificationForm, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));

    // Auto-generate title based on type if not customized
    if (field === 'notificationType' && !form.title) {
      const selectedProject = projects.find(p => p.id === form.projectId);
      if (selectedProject) {
        const titles = {
          milestone: `Milestone Reached - ${selectedProject.name}`,
          status_change: `Status Update - ${selectedProject.name}`,
          deadline: `Deadline Approaching - ${selectedProject.name}`,
          completion: `Project Completed - ${selectedProject.name}`
        };
        setForm(prev => ({ ...prev, title: titles[value as keyof typeof titles] || '' }));
      }
    }
  };

  const selectedProject = projects.find(p => p.id === form.projectId);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Target className="h-5 w-5" />
          <span>Project Notifications</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Project Selection */}
          <div className="space-y-2">
            <Label>Project</Label>
            <Select
              value={form.projectId}
              onValueChange={(value) => updateForm('projectId', value)}
              disabled={loadingProjects}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a project..." />
              </SelectTrigger>
              <SelectContent>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    <div className="flex items-center justify-between w-full">
                      <span>{project.name}</span>
                      <div className="flex items-center space-x-2 ml-2">
                        <Badge variant="outline" className="text-xs">
                          {project.workspaceName}
                        </Badge>
                        <Badge
                          variant={project.status === 'completed' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {project.status}
                        </Badge>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedProject && (
              <div className="text-sm text-muted-foreground">
                <Users className="h-3 w-3 inline mr-1" />
                {selectedProject.clientName && `${selectedProject.clientName} • `}
                {selectedProject.workspaceName}
              </div>
            )}
          </div>

          {/* Notification Type */}
          <div className="space-y-2">
            <Label>Notification Type</Label>
            <Select
              value={form.notificationType}
              onValueChange={(value: any) => updateForm('notificationType', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="milestone">Milestone Reached</SelectItem>
                <SelectItem value="status_change">Status Change</SelectItem>
                <SelectItem value="deadline">Deadline Reminder</SelectItem>
                <SelectItem value="completion">Project Completion</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Notification Title</Label>
            <Input
              id="title"
              value={form.title}
              onChange={(e) => updateForm('title', e.target.value)}
              placeholder="e.g., Milestone Reached: Phase 1 Complete"
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
            />
          </div>

          {/* Priority */}
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

          {/* Notification Options */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="notifyStakeholders">Notify All Stakeholders</Label>
              <input
                type="checkbox"
                id="notifyStakeholders"
                checked={form.notifyStakeholders}
                onChange={(e) => updateForm('notifyStakeholders', e.target.checked)}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              This will notify project team members, workspace admins, and client contacts
            </p>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end">
            <Button type="submit" disabled={loading || !form.projectId} className="flex items-center space-x-2">
              <Send className="h-4 w-4" />
              <span>{loading ? 'Sending...' : 'Send Notification'}</span>
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};