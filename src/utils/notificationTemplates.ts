// Notification templates for common scenarios
export interface NotificationTemplate {
  type: 'payment' | 'system' | 'warning' | 'success' | 'info' | 'error';
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high';
  actionUrl?: string;
  actionLabel?: string;
  expiresInDays?: number;
}

export class NotificationTemplates {
  // Payment-related templates
  static paymentReminder(workspaceName: string, amount: number, daysUntilDue: number): NotificationTemplate {
    const isOverdue = daysUntilDue < 0;
    const daysText = isOverdue
      ? `${Math.abs(daysUntilDue)} days overdue`
      : `due in ${daysUntilDue} days`;

    return {
      type: 'payment',
      title: `Payment Reminder - ${workspaceName}`,
      message: `Your payment of $${amount} is ${daysText}. Please complete payment to maintain full access to platform features.`,
      priority: isOverdue ? 'high' : 'medium',
      actionUrl: '/settings/billing',
      actionLabel: 'Pay Now',
      expiresInDays: 30
    };
  }

  static paymentOverdue(workspaceName: string, amount: number, daysOverdue: number): NotificationTemplate {
    return {
      type: 'warning',
      title: `Payment Overdue - ${workspaceName}`,
      message: `Your payment of $${amount} is ${daysOverdue} days overdue. Some features may be limited until payment is completed.`,
      priority: 'high',
      actionUrl: '/settings/billing',
      actionLabel: 'Complete Payment',
      expiresInDays: 7
    };
  }

  static paymentCompleted(workspaceName: string): NotificationTemplate {
    return {
      type: 'success',
      title: 'Payment Completed',
      message: `Payment for ${workspaceName} has been processed successfully. All features are now available.`,
      priority: 'low',
      expiresInDays: 7
    };
  }

  // System maintenance templates
  static maintenanceScheduled(startTime: Date, duration: string, description?: string): NotificationTemplate {
    return {
      type: 'warning',
      title: 'System Maintenance Scheduled',
      message: `Scheduled maintenance will begin on ${startTime.toLocaleString()} and last approximately ${duration}.${description ? ` ${description}` : ''}`,
      priority: 'medium',
      expiresInDays: 1
    };
  }

  static maintenanceStarted(duration: string): NotificationTemplate {
    return {
      type: 'warning',
      title: 'System Maintenance in Progress',
      message: `System maintenance has started and will last approximately ${duration}. Some features may be temporarily unavailable.`,
      priority: 'high',
      expiresInDays: 1
    };
  }

  static maintenanceCompleted(): NotificationTemplate {
    return {
      type: 'success',
      title: 'Maintenance Complete',
      message: 'System maintenance has been completed. All services are now fully operational.',
      priority: 'low',
      expiresInDays: 1
    };
  }

  // Project-related templates
  static projectMilestone(projectName: string, milestone: string): NotificationTemplate {
    return {
      type: 'success',
      title: `Project Milestone - ${projectName}`,
      message: `Congratulations! "${milestone}" milestone has been achieved for project "${projectName}".`,
      priority: 'medium',
      actionUrl: `/projects/${projectName.toLowerCase().replace(/\s+/g, '-')}`,
      actionLabel: 'View Project',
      expiresInDays: 30
    };
  }

  static projectDeadline(projectName: string, daysUntilDeadline: number): NotificationTemplate {
    return {
      type: 'warning',
      title: `Project Deadline - ${projectName}`,
      message: `Project "${projectName}" has a deadline in ${daysUntilDeadline} days. Please ensure all deliverables are on track.`,
      priority: daysUntilDeadline <= 3 ? 'high' : 'medium',
      actionUrl: `/projects/${projectName.toLowerCase().replace(/\s+/g, '-')}`,
      actionLabel: 'View Project',
      expiresInDays: 7
    };
  }

  static projectCompleted(projectName: string): NotificationTemplate {
    return {
      type: 'success',
      title: `Project Completed - ${projectName}`,
      message: `Project "${projectName}" has been successfully completed. All deliverables have been finalized.`,
      priority: 'medium',
      actionUrl: `/projects/${projectName.toLowerCase().replace(/\s+/g, '-')}`,
      actionLabel: 'View Results',
      expiresInDays: 30
    };
  }

  // Sample-related templates
  static sampleStatusUpdate(sampleId: string, oldStatus: string, newStatus: string): NotificationTemplate {
    return {
      type: 'info',
      title: `Sample Status Update - ${sampleId}`,
      message: `Sample ${sampleId} status changed from "${oldStatus}" to "${newStatus}".`,
      priority: 'low',
      actionUrl: `/samples/${sampleId}`,
      actionLabel: 'View Sample',
      expiresInDays: 7
    };
  }

  static sampleProcessingComplete(sampleId: string, results: string): NotificationTemplate {
    return {
      type: 'success',
      title: `Sample Processing Complete - ${sampleId}`,
      message: `Processing has been completed for sample ${sampleId}. ${results}`,
      priority: 'medium',
      actionUrl: `/samples/${sampleId}`,
      actionLabel: 'View Results',
      expiresInDays: 30
    };
  }

  // User invitation templates
  static userInvited(email: string, workspaceName: string, role: string): NotificationTemplate {
    return {
      type: 'info',
      title: `New Team Member Invited`,
      message: `${email} has been invited to join ${workspaceName} as a ${role}.`,
      priority: 'low',
      expiresInDays: 7
    };
  }

  static invitationAccepted(email: string, workspaceName: string): NotificationTemplate {
    return {
      type: 'success',
      title: `Team Member Joined`,
      message: `${email} has accepted the invitation and joined ${workspaceName}.`,
      priority: 'low',
      expiresInDays: 7
    };
  }

  // Welcome templates
  static workspaceWelcome(workspaceName: string): NotificationTemplate {
    return {
      type: 'success',
      title: `Welcome to MyLab!`,
      message: `Your workspace "${workspaceName}" has been successfully set up. Explore the platform and start managing your laboratory samples.`,
      priority: 'low',
      actionUrl: '/dashboard',
      actionLabel: 'Get Started',
      expiresInDays: 30
    };
  }

  static onboardingComplete(companyName: string): NotificationTemplate {
    return {
      type: 'success',
      title: 'Onboarding Complete',
      message: `Welcome ${companyName}! Your company onboarding is now complete. You have full access to all platform features.`,
      priority: 'medium',
      actionUrl: '/dashboard',
      actionLabel: 'Explore Platform',
      expiresInDays: 30
    };
  }
}

// Helper function to create notification from template
export function createNotificationFromTemplate(
  template: NotificationTemplate,
  userId: string,
  workspaceId?: string,
  additionalMetadata?: Record<string, any>
): NotificationTemplate & { persistent: boolean; metadata: Record<string, any> } {
  return {
    type: template.type,
    title: template.title,
    message: template.message,
    priority: template.priority,
    actionUrl: template.actionUrl,
    actionLabel: template.actionLabel,
    expiresInDays: template.expiresInDays,
    persistent: template.priority === 'high',
    metadata: {
      template: true,
      expiresInDays: template.expiresInDays,
      ...additionalMetadata
    }
  };
}