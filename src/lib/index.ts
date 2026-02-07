// Authentication
export { AuthContextProvider, useAuth } from './AuthContext'
export { hasPermission, canAccessSchema, canManageProjects, canViewProjects } from './auth'

// Configuration & Constants
export { FRONTEND_CONFIG, getAvailableModules, checkRouteAccess } from './config/frontend'

// Types & Schemas
export type { User, UserRole, Project, Sample } from './types'

// Utilities
export { default as axiosInstance } from './axiosConfig'

// Re-export from utils
export type { NotificationTemplate } from '../utils/notificationTemplates'
export { NotificationTemplates, createNotificationFromTemplate } from '../utils/notificationTemplates'
