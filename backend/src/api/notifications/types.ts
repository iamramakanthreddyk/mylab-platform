/**
 * Notifications types
 */

export interface CreateNotificationRequest {
  workspace_id: string;
  user_id?: string;
  type: string;
  title: string;
  message: string;
  data?: Record<string, any>;
}

export interface NotificationResponse {
  id: string;
  workspace_id: string;
  user_id?: string;
  type: string;
  title: string;
  message: string;
  data?: Record<string, any>;
  read_at?: string;
  created_at: string;
}

// ============ Custom Error Classes ============

export class NotificationNotFoundError extends Error {
  constructor(id: string) {
    super(`Notification ${id} not found`);
    this.name = 'NotificationNotFoundError';
  }
}

export class InvalidNotificationDataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidNotificationDataError';
  }
}
