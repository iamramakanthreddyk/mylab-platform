/**
 * Admin request/response types
 */

export interface SystemStatsResponse {
  totalUsers: number;
  activeUsers: number;
  totalWorkspaces: number;
  totalProjects: number;
  totalSamples: number;
  totalAnalyses: number;
  pendingOnboardings: number;
  upcomingPayments: number;
}

export interface AdminUserResponse {
  id: string;
  email: string;
  fullName: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

// ============ Custom Error Classes ============

export class AdminAccessDeniedError extends Error {
  constructor() {
    super('Admin access required');
    this.name = 'AdminAccessDeniedError';
  }
}

export class StatsGenerationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StatsGenerationError';
  }
}
